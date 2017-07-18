# kontinuum-s3-deploy

Sync a source with a lazily created s3 bucket.

## Requirements

[Setup Instructions](https://github.com/esayemm/kontinuum)


## Usage

```sh
./script.sh --name foo.com --is-index <source>
```


|Flag|Default|Required|Description|
|---|---|---|---|
|`--name`||true|s3 bucket name to create|
|`--is-index`|false|false|`www.${name}` bucket will also be created|

*eg.*

```sh
./node_modules/kontinuum-s3-deploy/script.sh --name example.com --is-index ./build
```