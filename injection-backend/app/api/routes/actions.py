from fastapi import APIRouter, HTTPException

from app.injection import manager
from app.models.network_action import ExecutionResult, NetworkAction, ValidationResult

router = APIRouter()


@router.post("/actions/validate", response_model=ValidationResult)
def validate_action(action: NetworkAction):
    return manager.validate(action)


@router.post("/actions/execute", response_model=ExecutionResult)
def execute_action(action: NetworkAction):
    return manager.execute(action)


@router.get("/actions", response_model=list[ExecutionResult])
def list_actions():
    return manager.list_history()


@router.get("/actions/{action_id}", response_model=ExecutionResult)
def get_action(action_id: str):
    result = manager.get_action(action_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Action not found.")
    return result
