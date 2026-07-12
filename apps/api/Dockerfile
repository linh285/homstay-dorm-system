FROM node:24-alpine

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api apps/api

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace", "@homestay/api"]
