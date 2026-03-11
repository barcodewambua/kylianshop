"""Entry point that runs Flask server serving both API and static frontend."""
# load Flask application instance from backend.app
from backend.app import app

if __name__ == "__main__":
    # ensure static folder path resolves correctly when invoked from root
    import os
    os.chdir(os.path.dirname(__file__))

    port = int(os.getenv('PORT', 3001))
    print(f"Running KylianShop full server on http://localhost:{port}")
    app.run(port=port)
