# kontinuum-route53

Create hosted zones and set resource record set in route53. 

### Requirements

[Setup Instructions](https://github.com/esayemm/kontinuum)

## Create s3 proxy for static sites

[Available values for target hosted zone id and target dns name.](http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region)

|Flag|Default|Required|Description|
|---|---|---|---|
|`--name`||true|Must match s3 bucket eg. foo.example.com|
|`--root`||true|Root domain eg. example.com|
|`--target-hosted-zone-id`|`Z3BJ6K6RIION7M`|false|Target hosted zone id from the list of available values. **Must match hosted zone of corresponding s3 bucket**|
|`--target-dns-name`|`s3-website-us-west-2.amazonaws.com.`|false|Target dns name has to match the selected target hosted zone id.|

*eg.*

```sh
./script.sh --name foo.example.com --root example.com
```

If name is the same as root then an alias for www.$root will also be created.


*[TODO]: only works for static sites via s3 buckets*

## Create proxy for servers

```sh
./upsert_resource_a_record.sh --name auth.example.com --root example.com --ip 10.0.0.1
```

|Flag|Default|Required|Description|
|---|---|---|---|
|`--name`||true|Name of backend service eg. `auth.example.com`|
|`--root`||true|Root domain eg. `example.com`|