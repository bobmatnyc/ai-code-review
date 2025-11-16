#!/usr/bin/env python3
"""Test script to verify mcp-ticketer MCP server functionality."""

import json
import subprocess
import sys
from typing import Any, Dict

def send_jsonrpc_request(process: subprocess.Popen, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Send a JSON-RPC request and get response."""
    request_id = 1
    request = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
    }
    if params:
        request["params"] = params

    request_json = json.dumps(request) + "\n"
    print(f"→ Sending: {method}", file=sys.stderr)

    process.stdin.write(request_json)
    process.stdin.flush()

    # Read response
    response_line = process.stdout.readline()
    if not response_line:
        raise Exception("No response from server")

    response = json.loads(response_line)
    print(f"← Received response for: {method}", file=sys.stderr)
    return response

def main():
    """Test the mcp-ticketer server."""

    # Start the MCP server
    cmd = [
        "/Users/masa/Projects/ai-code-review/.venv/bin/mcp-ticketer",
        "mcp",
        "serve",
        "--adapter",
        "aitrackdown",
        "--base-path",
        "/Users/masa/Projects/ai-code-review/.aitrackdown"
    ]

    print("Starting MCP server...", file=sys.stderr)
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    try:
        # Test 1: Initialize
        print("\n=== Test 1: Initialize ===", file=sys.stderr)
        init_response = send_jsonrpc_request(process, "initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        })
        print(f"Initialize: {json.dumps(init_response, indent=2)}")

        # Test 2: List tools
        print("\n=== Test 2: List Tools ===", file=sys.stderr)
        tools_response = send_jsonrpc_request(process, "tools/list")
        print(f"Tools count: {len(tools_response.get('result', {}).get('tools', []))}")
        print("Available tools:")
        for tool in tools_response.get('result', {}).get('tools', []):
            print(f"  - {tool['name']}: {tool.get('description', 'No description')[:60]}...")

        # Test 3: Create a ticket
        print("\n=== Test 3: Create Ticket ===", file=sys.stderr)
        create_response = send_jsonrpc_request(process, "tools/call", {
            "name": "ticket_create",
            "arguments": {
                "title": "Test ticket from MCP server test",
                "description": "Verifying MCP SDK integration works correctly",
                "priority": "medium",
                "tags": ["test", "mcp-sdk", "verification"]
            }
        })
        print(f"Create ticket response: {json.dumps(create_response, indent=2)}")

        # Extract ticket ID from response
        ticket_id = None
        if 'result' in create_response:
            content = create_response['result'].get('content', [])
            if content and len(content) > 0:
                text_content = content[0].get('text', '{}')
                result_data = json.loads(text_content)
                if result_data.get('status') == 'completed':
                    ticket_id = result_data.get('ticket', {}).get('id')

        # Test 4: Search for tickets
        print("\n=== Test 4: Search Tickets ===", file=sys.stderr)
        search_response = send_jsonrpc_request(process, "tools/call", {
            "name": "ticket_search",
            "arguments": {
                "query": "test",
                "limit": 5
            }
        })
        print(f"Search response: {json.dumps(search_response, indent=2)}")

        # Test 5: Create an epic
        print("\n=== Test 5: Create Epic ===", file=sys.stderr)
        epic_response = send_jsonrpc_request(process, "tools/call", {
            "name": "epic_create",
            "arguments": {
                "title": "MCP SDK Migration Epic",
                "description": "Track all tasks related to MCP SDK migration"
            }
        })
        print(f"Epic create response: {json.dumps(epic_response, indent=2)}")

        # Test 6: Error handling - invalid priority
        print("\n=== Test 6: Error Handling ===", file=sys.stderr)
        error_response = send_jsonrpc_request(process, "tools/call", {
            "name": "ticket_create",
            "arguments": {
                "title": "Error test ticket",
                "priority": "invalid_priority"
            }
        })
        print(f"Error handling response: {json.dumps(error_response, indent=2)}")

        # Test 7: List tickets
        print("\n=== Test 7: List All Tickets ===", file=sys.stderr)
        list_response = send_jsonrpc_request(process, "tools/call", {
            "name": "ticket_list",
            "arguments": {}
        })
        print(f"List tickets response: {json.dumps(list_response, indent=2)}")

        print("\n=== All tests completed successfully! ===", file=sys.stderr)

    except Exception as e:
        print(f"Error during testing: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1
    finally:
        process.terminate()
        process.wait(timeout=5)

    return 0

if __name__ == "__main__":
    sys.exit(main())
