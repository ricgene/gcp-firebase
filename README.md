
For use with Google Cloud conversational Agents
  - A webhook to add data to Firebase

Deploy with google cloud cli:
gcloud functions deploy dialogflowWebhook --runtime nodejs20 --trigger-http --allow-unauthenticated

two types of security have been explored admin and client.

The real env variables are in ~gitl/
Generate credentials from: 
