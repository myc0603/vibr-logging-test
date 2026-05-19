FROM node:22-alpine

WORKDIR /app

COPY generate-logs.js .

CMD ["node", "generate-logs.js"]
