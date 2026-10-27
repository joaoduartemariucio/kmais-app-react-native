BASE ?= origin/main
MIN_COVERAGE ?= 80
LCOV := coverage/lcov.info

SHELL := /bin/bash

.PHONY: ci deps lint format format-check typecheck build test coverage clean

ci: lint format-check build test coverage

deps:
	npm ci

lint:
	npx eslint . --max-warnings 0

format:
	npx prettier --write .

format-check:
	npx prettier --check .

typecheck:
	npx tsc --noEmit

build: typecheck
	rm -rf .build/export
	npx expo export --platform ios --platform android --output-dir .build/export

test:
	rm -rf coverage
	npx jest --coverage --ci

coverage:
	python3 scripts/diff_coverage.py --lcov $(LCOV) --base $(BASE) --min $(MIN_COVERAGE)

clean:
	rm -rf .build coverage dist .expo
