# kontinuum-s3-deploy

Sync a source with a lazily created s3 bucket.

## Requirements

[Setup Instructions](https://github.com/esayemm/kontinuum)


## Usage

```sh
./script.sh --name foo.com --is-index <source>
```

`--name `: s3 bucket name to create

`--is-index`: is meant to be an the root domain, therefore `www.${name}` bucket will also be created

ex.

```sh
./node_modules/kontinuum-s3-deploy/script.sh --name example.com --is-index ./build
```