install:
	npm ci

bootstrap:
	npx lerna bootstrap

lint:
	npx eslint . --no-error-on-unmatched-pattern

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

build:
	npx tsc --build tsconfig.build.json
