import { sha256 } from "js-sha256";
import { createHash } from "crypto";
import * as bitcoin from "bitcoinjs-lib";
import * as ByteBuffer from "bytebuffer";
import { KademliaId } from "./KademliaId";

export class KadContent {
  private id: KademliaId; //we store the ID duplicated because of performance reasons (new lookup in the hashmap costs more than a bit of memory)
  private timestamp: number; //created at (or updated), long
  private pubkey: ArrayBuffer;
  private content: ArrayBuffer;
  private signature: ArrayBuffer;

  constructor(
    id: KademliaId,
    timestamp: number,
    pubkey: ArrayBuffer,
    content: ArrayBuffer,
    signature: ArrayBuffer
  ) {
    this.id = id;
    this.timestamp = timestamp;
    this.pubkey = pubkey;
    this.content = content;
    this.signature = signature;
  }

  createHash(): Buffer {
    let hashing = sha256.create();

    let hashBuffer = new ByteBuffer();
    hashBuffer.writeInt64(this.timestamp);
    hashBuffer.append(this.content);

    hashBuffer.flip();

    // hashing.update(answer.timestamp);
    hashing.update(hashBuffer.toArrayBuffer());

    let asdf = ByteBuffer.wrap(hashing.arrayBuffer());
    console.log(asdf.toHex());

    return Buffer.from(hashing.arrayBuffer());
  }

  verify(): boolean {
    let updateKey = bitcoin.ECPair.fromPublicKey(Buffer.from(this.pubkey));

    let hash = this.createHash();

    let verified = updateKey.verify(hash, Buffer.from(this.signature));
    return verified;
  }

  signWith(key: any) {
    let hash = this.createHash();

    let signature = key.sign(hash);
    // console.log("signature");
    // console.log(signature);

    this.signature = ByteBuffer.wrap(signature).toArrayBuffer();
  }

  public getId(): KademliaId {
    return this.id;
  }
  public getTimestamp(): number {
    return this.timestamp;
  }
  public getPublicKey(): ArrayBuffer {
    return this.pubkey;
  }
  public getContent(): ArrayBuffer {
    return this.content;
  }
  public getSignature(): ArrayBuffer {
    return this.signature;
  }
}
