from typing import Annotated, Optional
from pydantic import BeforeValidator

# Converts MongoDB BSON ObjectId to string transparently in Pydantic models
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if v is not None else None)]
