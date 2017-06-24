### Check Domain Availability

```sh
aws route53domains check-domain-availability --domain-name example.com --region us-east-1
```

*note: that you have to use `--region us-east-1` because amazon? (route53domains service from amazon is only available in that region)*

Result:

```json
{
    "Availability": "AVAILABLE" or "UNAVAILABLE"
}
```