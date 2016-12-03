### enable disable benchmarket in tests:

```

## enable benchmarket

sed -i "" s/"\/\/require('benchmarket')"/"require('benchmarket')"/ ../test/**.js

sed -i "" s/"\/\/after(require('benchmarket')"/"after(require('benchmarket')"/ ../test/**.js

## disable benchmarket

sed -i "" s/"require('benchmarket')"/"\/\/require('benchmarket')"/ ../test/**.js

sed -i "" s/"after(require('benchmarket')"/"\/\/after(require('benchmarket')"/ ../test/**.js

```
