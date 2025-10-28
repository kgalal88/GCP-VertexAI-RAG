// Copyright 2021 Google LLC
// ... (License header remains the same)

'use strict';

const functions = require('@google-cloud/functions-framework');

const { GoogleAuth } = require('google-auth-library');
const auth = new GoogleAuth();

functions.cloudEvent('embedFromGCS', async (cloudEvent) => {
    
    console.log(`Event ID: ${cloudEvent.id}`);
    console.log(`Event Type: ${cloudEvent.type}`);

    const file = cloudEvent.data;
    const bucket = file.bucket;
    const fileName = file.name;

    console.log(`Bucket: ${bucket}`);
    console.log(`File: ${fileName}`);
    console.log(`Updated: ${file.updated}`);

    // Check if the file name exists (e.g., ignore bucket root creation events)
    if (!fileName) {
        console.log('Skipping event: File name is missing.');
        return; // Successfully exit without publishing
    }

    // ⚠️ REPLACE with your actual Cloud Run URL
    const CLOUD_RUN_URL = 'https://my-ai-rag-app-1091313701655.asia-south1.run.app/embed';
    // The audience for the ID token must be the root service URL
    const CLOUD_RUN_AUDIENCE = 'https://my-ai-rag-app-1091313701655.asia-south1.run.app'; 

    console.log(`Calling Cloud Run service at: ${CLOUD_RUN_URL}`);

    try {
        // The getClient() method returns an authenticated client (a version of axios/fetch)
        // configured to automatically fetch an ID token and set the Authorization header.
        const client = await auth.getIdTokenClient(CLOUD_RUN_AUDIENCE);

        const payload = {
          fileName: fileName
        };

        // Make the authenticated POST request
        const response = await client.request({ 
            url: CLOUD_RUN_URL,
            method: 'POST',   // <-- Change method to POST
            data: payload,    // <-- Add the request body data
            // The client automatically sets the 'Content-Type': 'application/json' 
            // when a data object is provided.
        });

        console.log('Cloud Run Response Status:', response.status);
        
        console.log('Successfully called Cloud Run service.');      

    } catch (error) {
        console.error('Error calling Cloud Run:', error.message); 
    }

});
