To use:
```sh
kustomize build . | kubectl apply -f -
```

To validate:
```sh
kustomize build . | kubeval
```
