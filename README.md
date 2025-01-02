<h1 align="center">mumble-client</h1>

<p align="center">A simple mumble client for managing mumble servers</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tf2pickup-org/mumble-client">
    <img src="https://img.shields.io/npm/v/@tf2pickup-org/mumble-client" alt="Latest release">
  </a>
  <a href="https://github.com/tf2pickup-org/mumble-client/actions?query=workflow%3Atest">
    <img src="https://github.com/tf2pickup-org/mumble-client/actions/workflows/test.yml/badge.svg" alt="Test status">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT license">
  </a>
</p>

### Installation

```bash
$ npm i @tf2pickup-org/mumble-client
```

### Usage

#### Connect to a mumble server

```typescript
import { Client } from '@tf2pickup-org/mumble-client';

const client = new Client({
  host: 'mumble://example.com',
  port: 64738,
  username: 'me',
});
await client.connect();

console.log(client.welcomeText);

if (client.user) {
  console.log(`logged in as ${client.user.name}`);
}
```
