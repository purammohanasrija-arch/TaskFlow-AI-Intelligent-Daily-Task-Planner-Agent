import asyncio
import copy
import json
import logging
import os
import re
import sqlite3
import threading
from datetime import datetime, date, timezone
from typing import Any, Dict, List, Optional, Union
from bson import ObjectId

logger = logging.getLogger(__name__)


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if hasattr(obj, "value"):  # Enum support
            return obj.value
        if isinstance(obj, ObjectId):
            return str(obj)
        try:
            return super().default(obj)
        except Exception:
            return str(obj)


def json_dumps(data: Any) -> str:
    return json.dumps(data, cls=CustomJSONEncoder)


def json_loads(data_str: str) -> dict:
    return json.loads(data_str)


class InsertOneResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class InsertManyResult:
    def __init__(self, inserted_ids: List[str]):
        self.inserted_ids = inserted_ids


class UpdateResult:
    def __init__(self, matched_count: int, modified_count: int, upserted_id: Optional[str] = None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


def _normalize_val(val: Any) -> Any:
    if isinstance(val, ObjectId):
        return str(val)
    if hasattr(val, "value"):
        return val.value
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def _match_field_value(doc_val: Any, target_val: Any) -> bool:
    doc_val_norm = _normalize_val(doc_val)
    target_val_norm = _normalize_val(target_val)

    if isinstance(target_val, dict):
        # Operators like $ne, $gte, $lte, $gt, $lt, $in, $nin, $regex
        for op, op_val in target_val.items():
            op_val_norm = _normalize_val(op_val)
            if op == "$ne":
                if doc_val_norm == op_val_norm:
                    return False
            elif op == "$eq":
                if doc_val_norm != op_val_norm:
                    return False
            elif op == "$gte":
                if doc_val_norm is None or doc_val_norm < op_val_norm:
                    return False
            elif op == "$lte":
                if doc_val_norm is None or doc_val_norm > op_val_norm:
                    return False
            elif op == "$gt":
                if doc_val_norm is None or doc_val_norm <= op_val_norm:
                    return False
            elif op == "$lt":
                if doc_val_norm is None or doc_val_norm >= op_val_norm:
                    return False
            elif op == "$in":
                in_list = [_normalize_val(x) for x in op_val]
                if doc_val_norm not in in_list:
                    return False
            elif op == "$nin":
                nin_list = [_normalize_val(x) for x in op_val]
                if doc_val_norm in nin_list:
                    return False
            elif op == "$regex":
                flags = re.IGNORECASE if target_val.get("$options") == "i" else 0
                str_val = str(doc_val_norm or "")
                if not re.search(str(op_val), str_val, flags=flags):
                    return False
        return True

    return doc_val_norm == target_val_norm


def _get_nested(doc: dict, key: str) -> Any:
    if "." in key:
        parts = key.split(".")
        cur = doc
        for p in parts:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                return None
        return cur
    return doc.get(key)


def match_doc(doc: dict, query: Optional[dict]) -> bool:
    if not query:
        return True

    for k, v in query.items():
        if k == "$or":
            if not any(match_doc(doc, sub_q) for sub_q in v):
                return False
        elif k == "$and":
            if not all(match_doc(doc, sub_q) for sub_q in v):
                return False
        elif k == "_id":
            doc_id = str(doc.get("_id") or doc.get("id") or "")
            target_id = str(v)
            if doc_id != target_id:
                return False
        else:
            doc_val = _get_nested(doc, k)
            if not _match_field_value(doc_val, v):
                return False

    return True


def apply_set(doc: dict, set_fields: dict) -> None:
    for key, val in set_fields.items():
        val_norm = _normalize_val(val)
        if "." in key:
            parts = key.split(".")
            cur = doc
            for p in parts[:-1]:
                if p not in cur or not isinstance(cur[p], dict):
                    cur[p] = {}
                cur = cur[p]
            cur[parts[-1]] = val_norm
        else:
            doc[key] = val_norm


class SQLiteCursor:
    def __init__(self, docs: List[dict]):
        self._docs = docs

    def sort(self, field: str, direction: int = 1) -> "SQLiteCursor":
        def sort_key(doc: dict):
            val = _get_nested(doc, field)
            if val is None:
                return (1, "") if direction == 1 else (-1, "")
            val_norm = _normalize_val(val)
            try:
                return (0, val_norm)
            except Exception:
                return (0, str(val_norm))

        self._docs.sort(key=sort_key, reverse=(direction == -1))
        return self

    def skip(self, count: int) -> "SQLiteCursor":
        self._docs = self._docs[count:]
        return self

    def limit(self, count: int) -> "SQLiteCursor":
        self._docs = self._docs[:count]
        return self

    async def to_list(self, length: Optional[int] = None) -> List[dict]:
        if length is not None:
            return copy.deepcopy(self._docs[:length])
        return copy.deepcopy(self._docs)

    def __iter__(self):
        return iter(copy.deepcopy(self._docs))

    async def __aiter__(self):
        for item in copy.deepcopy(self._docs):
            yield item


class SQLiteCollection:
    def __init__(self, db: "SQLiteDatabase", name: str):
        self.db = db
        self.name = name
        self._ensure_table()

    def _ensure_table(self):
        with self.db.lock:
            with self.db.get_connection() as conn:
                conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {self.name} (
                        id TEXT PRIMARY KEY,
                        data TEXT NOT NULL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                conn.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{self.name}_id ON {self.name}(id);
                """)
                conn.commit()

    async def create_index(self, *args, **kwargs) -> str:
        # SQLite uses primary index on id; indices on JSON are optional
        return "index_created"

    def _sync_find_all(self) -> List[dict]:
        with self.db.lock:
            with self.db.get_connection() as conn:
                cur = conn.cursor()
                cur.execute(f"SELECT data FROM {self.name}")
                rows = cur.fetchall()
                docs = []
                for (row_data,) in rows:
                    try:
                        docs.append(json_loads(row_data))
                    except Exception as e:
                        logger.error(f"Error decoding document from {self.name}: {e}")
                return docs

    def _sync_insert_one(self, doc: dict) -> str:
        doc_copy = copy.deepcopy(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(ObjectId())
        else:
            doc_copy["_id"] = str(doc_copy["_id"])

        doc_id = doc_copy["_id"]
        data_json = json_dumps(doc_copy)

        with self.db.lock:
            with self.db.get_connection() as conn:
                conn.execute(
                    f"INSERT OR REPLACE INTO {self.name} (id, data, updated_at) VALUES (?, ?, ?)",
                    (doc_id, data_json, datetime.now(timezone.utc).isoformat())
                )
                conn.commit()
        return doc_id

    async def insert_one(self, doc: dict) -> InsertOneResult:
        doc_id = await asyncio.to_thread(self._sync_insert_one, doc)
        doc["_id"] = doc_id
        return InsertOneResult(inserted_id=doc_id)

    async def insert_many(self, docs: List[dict]) -> InsertManyResult:
        inserted_ids = []
        for doc in docs:
            res = await self.insert_one(doc)
            inserted_ids.append(res.inserted_id)
        return InsertManyResult(inserted_ids=inserted_ids)

    async def find_one(self, query: Optional[dict] = None) -> Optional[dict]:
        all_docs = await asyncio.to_thread(self._sync_find_all)
        for doc in all_docs:
            if match_doc(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query: Optional[dict] = None) -> SQLiteCursor:
        all_docs = self._sync_find_all()
        matched = [d for d in all_docs if match_doc(d, query)]
        return SQLiteCursor(matched)

    def _sync_update_one(self, query: dict, update: dict, upsert: bool) -> UpdateResult:
        all_docs = self._sync_find_all()
        target_doc = None
        for doc in all_docs:
            if match_doc(doc, query):
                target_doc = doc
                break

        if target_doc:
            if "$set" in update:
                apply_set(target_doc, update["$set"])
            if "$unset" in update:
                for k in update["$unset"]:
                    target_doc.pop(k, None)

            target_id = target_doc["_id"]
            data_json = json_dumps(target_doc)
            with self.db.lock:
                with self.db.get_connection() as conn:
                    conn.execute(
                        f"UPDATE {self.name} SET data = ?, updated_at = ? WHERE id = ?",
                        (data_json, datetime.now(timezone.utc).isoformat(), target_id)
                    )
                    conn.commit()
            return UpdateResult(matched_count=1, modified_count=1)

        if upsert:
            new_doc = {}
            for k, v in query.items():
                if not k.startswith("$") and "." not in k:
                    new_doc[k] = _normalize_val(v)
            if "$set" in update:
                apply_set(new_doc, update["$set"])
            if "_id" not in new_doc:
                new_doc["_id"] = str(ObjectId())
            else:
                new_doc["_id"] = str(new_doc["_id"])

            doc_id = new_doc["_id"]
            data_json = json_dumps(new_doc)
            with self.db.lock:
                with self.db.get_connection() as conn:
                    conn.execute(
                        f"INSERT INTO {self.name} (id, data, updated_at) VALUES (?, ?, ?)",
                        (doc_id, data_json, datetime.now(timezone.utc).isoformat())
                    )
                    conn.commit()
            return UpdateResult(matched_count=0, modified_count=1, upserted_id=doc_id)

        return UpdateResult(matched_count=0, modified_count=0)

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> UpdateResult:
        return await asyncio.to_thread(self._sync_update_one, query, update, upsert)

    def _sync_delete_one(self, query: dict) -> DeleteResult:
        all_docs = self._sync_find_all()
        for doc in all_docs:
            if match_doc(doc, query):
                doc_id = doc["_id"]
                with self.db.lock:
                    with self.db.get_connection() as conn:
                        conn.execute(f"DELETE FROM {self.name} WHERE id = ?", (doc_id,))
                        conn.commit()
                return DeleteResult(deleted_count=1)
        return DeleteResult(deleted_count=0)

    async def delete_one(self, query: dict) -> DeleteResult:
        return await asyncio.to_thread(self._sync_delete_one, query)

    def _sync_delete_many(self, query: dict) -> DeleteResult:
        all_docs = self._sync_find_all()
        ids_to_delete = [doc["_id"] for doc in all_docs if match_doc(doc, query)]
        if not ids_to_delete:
            return DeleteResult(deleted_count=0)

        with self.db.lock:
            with self.db.get_connection() as conn:
                placeholders = ",".join("?" for _ in ids_to_delete)
                conn.execute(f"DELETE FROM {self.name} WHERE id IN ({placeholders})", ids_to_delete)
                conn.commit()
        return DeleteResult(deleted_count=len(ids_to_delete))

    async def delete_many(self, query: dict) -> DeleteResult:
        return await asyncio.to_thread(self._sync_delete_many, query)

    async def count_documents(self, query: Optional[dict] = None) -> int:
        all_docs = await asyncio.to_thread(self._sync_find_all)
        return sum(1 for d in all_docs if match_doc(d, query))


class SQLiteDatabase:
    def __init__(self, db_path: str = "taskflow.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._collections: Dict[str, SQLiteCollection] = {}
        # Pre-initialize connection to set WAL mode
        with self.get_connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.commit()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        return conn

    def __getitem__(self, name: str) -> SQLiteCollection:
        if name not in self._collections:
            self._collections[name] = SQLiteCollection(self, name)
        return self._collections[name]

    @property
    def admin(self):
        class AdminMock:
            async def command(self, cmd: str):
                return {"ok": 1}
        return AdminMock()

    def close(self):
        pass
