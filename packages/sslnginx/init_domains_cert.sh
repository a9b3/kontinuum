mkdir /var/www/letsencrypt

# /etc/letsencrypt/live/your_domain_name
# ./fullchain.pem => ssl_certificate
# ./privkey.pem => ssl_certificate_key
/src/certbot-auto certonly \
  --staging \
  -c ./adeptlr.ini
