from fastapi import APIRouter

router = APIRouter()


@router.get("/interfaces")
def get_interfaces():
    interfaces = []
    try:
        import psutil  # type: ignore

        for name in psutil.net_if_addrs().keys():
            interfaces.append({"name": name, "description": name})
    except Exception:
        try:
            import socket

            for _, name in socket.if_nameindex():
                interfaces.append({"name": name, "description": name})
        except Exception:
            interfaces = [{"name": "lo0", "description": "Loopback (fallback)"}]

    return {"interfaces": interfaces}
