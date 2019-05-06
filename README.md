# Setup

## Container

```
cd ~/web/chat-socket
cp .env.example .env
```

Fill in missing config

Exec into your container `dockbash chat-socket.local`

```
npm install
exit
```

## Public key

```
cd ~/web/chat-socket
cp ~/web/riptides-api/config/jwt/public.pem key/public.pem
```

## To run

Exec into your container `dockbash chat-socket.local`

```
npm run dev
```