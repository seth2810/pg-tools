install:
	npm ci

lint:
	npx eslint . --no-error-on-unmatched-pattern

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

build:
	npx tsc

publish:
	npm publish --dry-run
