# 1. Start with the base httpd image
FROM httpd:latest

# 2. Copy your web files
COPY dist/chatbot/browser/. /usr/local/apache2/htdocs/

# 3. Use an entrypoint script to dynamically configure the port
# The sed command finds the "Listen 80" line and replaces it with "Listen $PORT"
# This ensures Apache listens on the port (e.g., 8080) provided by Cloud Run.
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /usr/local/apache2/conf/httpd.conf

# 4. EXPOSE 80 is no longer strictly necessary but can remain for documentation
# The actual running port is handled by the dynamic configuration above.
EXPOSE 8080