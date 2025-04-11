def with_log(label: str, truncate: int = 300):
    def decorator(fn):
        def wrapped(state):
            print(f"\n🔹 [NODE: {label}] ➤ INPUT:")
            for k, v in state.items():
                display = str(v)
                if len(display) > truncate:
                    display = display[:truncate] + "..."
                print(f"   - {k}: {display}")
            output = fn(state)
            print(f"✅ [NODE: {label}] ➤ OUTPUT:")
            for k, v in output.items():
                display = str(v)
                if len(display) > truncate:
                    display = display[:truncate] + "..."
                print(f"   → {k}: {display}")
            return output
        return wrapped
    return decorator
