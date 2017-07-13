*note: that you have to use `--region us-east-1` because amazon? (route53domains service from amazon is only available in that region)*

### Check Domain Availability

```sh
aws route53domains check-domain-availability --domain-name example.com --region us-east-1
```

Example Result:

```json
{
    "Availability": "AVAILABLE" or "UNAVAILABLE"
}
```

### List Domains

```
aws route53domains list-domains --region us-east-1
```

Example Result:

```
{
    "Domains": [
        {
            "TransferLock": false, 
            "AutoRenew": true, 
            "Expiry": 1529007290.0, 
            "DomainName": "slickcarrentals.com"
        }
    ]
}
```	

### Register Domain

```sh
aws route53domains register-domain --region us-east-1 --cli-input-json '{
    "DomainName": "", 
    "IdnLangCode": "", 
    "DurationInYears": 0, 
    "AutoRenew": true, 
    "AdminContact": {
        "FirstName": "", 
        "LastName": "", 
        "ContactType": "", 
        "OrganizationName": "", 
        "AddressLine1": "", 
        "AddressLine2": "", 
        "City": "", 
        "State": "", 
        "CountryCode": "", 
        "ZipCode": "", 
        "PhoneNumber": "", 
        "Email": "", 
        "Fax": "", 
        "ExtraParams": [
            {
                "Name": "", 
                "Value": ""
            }
        ]
    }, 
    "RegistrantContact": {
        "FirstName": "", 
        "LastName": "", 
        "ContactType": "", 
        "OrganizationName": "", 
        "AddressLine1": "", 
        "AddressLine2": "", 
        "City": "", 
        "State": "", 
        "CountryCode": "", 
        "ZipCode": "", 
        "PhoneNumber": "", 
        "Email": "", 
        "Fax": "", 
        "ExtraParams": [
            {
                "Name": "", 
                "Value": ""
            }
        ]
    }, 
    "TechContact": {
        "FirstName": "", 
        "LastName": "", 
        "ContactType": "", 
        "OrganizationName": "", 
        "AddressLine1": "", 
        "AddressLine2": "", 
        "City": "", 
        "State": "", 
        "CountryCode": "", 
        "ZipCode": "", 
        "PhoneNumber": "", 
        "Email": "", 
        "Fax": "", 
        "ExtraParams": [
            {
                "Name": "", 
                "Value": ""
            }
        ]
    }, 
    "PrivacyProtectAdminContact": true, 
    "PrivacyProtectRegistrantContact": true, 
    "PrivacyProtectTechContact": true
}'
```

Result:

```
<operation id>
```

### Get operation status

```sh
aws route53domains get-operation-detail --region us-east-1 --operation-id <operation id>
```

Example Result:

```
aws-is-cool.de	24bXXX78-XXXX-4c68-XXXX-276XXXd645f1 IN_PROGRESS 1432XXXX133.5REGISTER_DOMAIN
```

Grep for `SUCCESSFUL`