from fastapi import APIRouter, HTTPException

from app.injection.uart import uart_manager
from app.injection.executors.remote_pi_executor import RemotePiExecutor
from app.models.uart_action import UARTAction, UARTExecutionResult, UARTValidationResult

router = APIRouter()


@router.post("/uart/actions/validate", response_model=UARTValidationResult)
def validate_uart_action(action: UARTAction):
    return uart_manager.validate(action)


@router.post("/uart/actions/execute", response_model=UARTExecutionResult)
def execute_uart_action(action: UARTAction):
    return uart_manager.execute(action)


@router.get("/uart/actions", response_model=list[UARTExecutionResult])
def list_uart_actions():
    return uart_manager.list_history()


@router.get("/uart/actions/{action_id}", response_model=UARTExecutionResult)
def get_uart_action(action_id: str):
    result = uart_manager.get_action(action_id)
    if result is None:
        raise HTTPException(status_code=404, detail="UART action not found.")
    return result


@router.get("/uart/interfaces")
def uart_interfaces():
    """Proxies the configured node's UART interface discovery."""
    executor = RemotePiExecutor()
    return {"interfaces": executor.get_uart_interfaces()}
