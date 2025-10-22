FROM node:20-slim
WORKDIR /usr/app

# Install dependencies and build the project.
COPY package.json package-lock.json ./
RUN npm install
COPY . .

COPY application_default_credentials.json /root/.config/gcloud/

ENV GOOGLE_CLOUD_PROJECT="project-ecdcfdd2-bb6a-4b14-94a"
ENV GOOGLE_APPLICATION_CREDENTIALS="/root/.config/gcloud/application_default_credentials.json"

CMD npm run start:tsx
