import asyncio
import sys

from app.seed.seed import seed_data


def main() -> int:
    try:
        asyncio.run(seed_data())
    except KeyboardInterrupt:
        print("Seed interrupted by user.")
        return 130
    except Exception as exc:
        print(f"Seed failed: {exc}")
        return 1

    print("Seed completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
