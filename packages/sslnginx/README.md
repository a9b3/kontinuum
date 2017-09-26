# letsencrypt nginx

```
brew install nginx

# to reload
nginx -s reload
```

- `/etc/nginx/sites-enabled/`
- `/var/www`

```
mkdir /var/www/letsencrypt

/src/certbot-auto certonly -c ./ini
```

Content of `./ini`

```
domains = foo.example.com
rsa-key-size = 4096
email = email@email
text = True

# .well-known/acme-challenge/ will be placed in the webroot-path that is
# specified. letsencrypt servers will attempt to finish a challenge by reaching
# the file it generated at $webroot-path/.well-known/acme-challenge/
authenticator = webroot
webroot-path = /var/www/letsencrypt
```

Content of each sites-enabled conf for nginx.

```
upstream foo {
  server 0.0.0.0:8000;
}

# Proxy all http to https
server {
  listen 80;
  listen [::]:80;
  server_name foo.example.com;
  return 301 https://foo.example.com$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name foo.example.com;

  ssl on;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_stapling on;
  ssl_stapling_verify on;
  ssl_certificate /etc/letsencrypt/live/foo.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/foo.example.com/privkey.pem;

  location / {
    proxy_pass http://foo;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded_For $proxy_add_x_forwarded_for;
  }

  location /.well-known/ {
    root /var/www/letsencrypt/;
  }
}
```