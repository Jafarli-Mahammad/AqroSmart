import asyncio
import time
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine, Base, AsyncSessionLocal
from sqlalchemy import text, event
from sqlalchemy.engine import Engine
import time

query_count = 0
query_list = []

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    global query_count
    query_count += 1
    query_list.append(statement)

async def audit():
    print("Starting ruthless end-to-end audit...")
    transport = ASGITransport(app=app)
    
    # 1. Clean DB
    async with engine.begin() as conn:
        tables = Base.metadata.sorted_tables
        if tables:
            table_names = ", ".join(f'"{t.name}"' for t in tables)
            await conn.execute(text(f"TRUNCATE TABLE {table_names} CASCADE"))
            
    print("✓ Database empty")
    
    # Extract routes
    routes = []
    for route in app.routes:
        if hasattr(route, "methods") and route.path.startswith("/"):
            routes.append((route.path, route.methods))
            
    print(f"✓ Found {len(routes)} routes")

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Phase 1: Test with empty database
        print("\n--- PHASE 1: EMPTY DATABASE ---")
        for path, methods in routes:
            if "GET" in methods:
                # Fuzz parameters
                url = path.replace("{farm_id}", "1").replace("{field_id}", "1").replace("{farmer_id}", "1")
                try:
                    global query_count
                    query_count = 0
                    query_list.clear()
                    
                    start_t = time.time()
                    resp = await client.get(url)
                    end_t = time.time()
                    
                    status = resp.status_code
                    print(f"GET {url:30} -> {status} ({query_count} queries, {(end_t-start_t)*1000:.1f}ms)")
                    if status == 500:
                        print(f"   [!] 500 ERROR: {resp.text}")
                    if query_count > 5:
                        print(f"   [!] POTENTIAL N+1 or high query count: {query_count}")
                except Exception as e:
                    print(f"GET {url:30} -> Exception: {e}")

        # Phase 2: Fuzzing parameters (Invalid IDs, SQLi, Special Chars)
        print("\n--- PHASE 2: INVALID/FUZZED INPUTS ---")
        fuzz_payloads = [
            "-1", "9999999", "0", "null", "undefined", "' OR 1=1--", "DROP TABLE farms;", 
            "A"*1000, "1/0", "%00", "True", "{}", "[]"
        ]
        
        for path, methods in routes:
            if "GET" in methods and "{farm_id}" in path:
                for payload in fuzz_payloads:
                    url = path.replace("{farm_id}", payload)
                    resp = await client.get(url)
                    if resp.status_code >= 500:
                        print(f"   [!] 500 ERROR on {url}: {resp.text}")

        # Phase 3: Concurrent connections
        print("\n--- PHASE 3: CONCURRENCY STRESS (100 reqs) ---")
        url = "/farms"
        start_t = time.time()
        tasks = [client.get(url) for _ in range(100)]
        results = await asyncio.gather(*tasks)
        end_t = time.time()
        successes = len([r for r in results if r.status_code == 200])
        print(f"100 requests to {url} completed in {end_t-start_t:.2f}s. Successes: {successes}/100")

if __name__ == "__main__":
    asyncio.run(audit())
