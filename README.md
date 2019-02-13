# HexSyn
A simple format for hand writing binary files. 

Example:
```
AA BB CC
```

Will write `0xAABBCC` to a file.

```
AA BB
CC DD ; They can be spread out as you want
EEFF ; and it has comments
```
Will write `0xAABBCCDDEEFF` to a file, ignoring the comments.
This lets you make notes as you read it, which can be useful for figuring out formats.

There's also different ways of writing values.

Binary:
```
!b101
```
Will write `0x05` to the file.
(I use `!b` instead of the usual `0b` prefix, as it would be quite the challenge (if at all possible) to differentiate between
`0b101` as hex and `0b101` as binary)

Hexadecimal. This is just if you want to be really explicit, as the default is hex.
```
!bABEE
```
Will write `0xABEE`

Octal
```
!o777
```
Will write `0x01ff` (`0x1ff` -> `0x01ff`)

Decimal
```
!d142
```
Will write `0x8E`

There's also a way of not having to do lots of repeated typing. The repeat operator (or times operator).

```
AA * !d3
```
Will write `0xAAAAAA`
(It requires an explicit type)

The repeat op only repeats the last 'byte group'
A byte group is a group of bytes (wow!) that was last consumed

```
AA ; A bytegroup '0xAA'
BEEE ; A bytegroup '0xBEEE'
!d64 ; A bytegroup '0x41'
!"ABC" ; A bytegroup '0x414243'
```

So

```
AA     * 2 ; 0xAAAA
BEEE   * 2 ; 0xBEEEBEEEBEEE
!d64   * 2 ; 0x4141
!"ABC" * 2 ; 0x414243414243
```

Note that if you do
```
AA!d64 * 2
```
It will only repeat the last one. I would like to make so if you don't include spaces they're grouped together, but it currently doesn't.

Also,
```
AA * 2 * 2
```
Will only do `0xAAAAAA`
Rather than repeating the last times again, it would be nice to do this as well.