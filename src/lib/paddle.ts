import { Paddle, Environment } from "@paddle/paddle-node-sdk";

let _paddle: Paddle | null = null;

export function getPaddle(): Paddle {
  if (!_paddle) {
    _paddle = new Paddle(process.env.PADDLE_API_KEY!, {
      environment:
        process.env.PADDLE_ENV === "sandbox"
          ? Environment.sandbox
          : Environment.production,
    });
  }
  return _paddle;
}
