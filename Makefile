.PHONY: install backend frontend test demo lint

install:
	python -m pip install -r requirements.txt
	cd frontend && npm install

backend:
	uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

test:
	pytest backend/tests -q

demo:
	python scripts/run_demo.py

download-model:
	python scripts/download_model.py

benchmark:
	python scripts/benchmark.py
