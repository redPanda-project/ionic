class KademliaId {
  // Commands.ID_LENGTH is the byte len of the key!
  private keyBytes: ArrayBuffer;

  constructor(bytes: ArrayBuffer) {
    this.keyBytes = bytes;
  }
}
