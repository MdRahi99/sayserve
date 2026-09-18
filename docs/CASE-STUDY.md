# SayServe — case study

For the portfolio site. Roughly 600 words, which is about as much as anyone
reads. Trim rather than add.

---

## The short version

**SayServe** is a takeaway ordering system where tapping, typing and speaking all
fill the same cart — and where most orders never reach a language model.

Next.js, Node, Express, MongoDB, Socket.io, Stripe. TypeScript throughout.

[Live site](https://sayserve.vercel.app) · [Code](https://github.com/MdRahi99/sayserve)

---

## The problem

It grew out of my MSc research, which compared four architectures for LLM-based
food ordering on a 210-order benchmark. The best of them worked, but the
classifier at its centre scored 51.9% — and the more I looked at that number, the
clearer it became that the model was being asked the wrong question.

The classifier's job was to decide whether an order was "incomplete". But
whether a cheeseburger meal is missing its drink is not an opinion to be
inferred from wording. It is a fact about the cart, and the menu data already
knows it.

## The decision

I rebuilt the pipeline so the language model is the fourth stage, not the first.

```
message
  1. safety    deterministic regex. the only stage that may refuse
  2. parse     "2 cheeseburgers, no onions, and a large coke" — no model call
  3. resolve   exact, then typo-tolerant, then meaning: "chips", "something fizzy"
  4. model     only the messy ones. returns the whole cart as JSON
  5. apply     priced and validated against the live menu
```

"Two cheeseburgers and a large coke" is not a language problem. It is a
quantity, an item and a size, in a sentence people have used at counters for
decades. Reading it directly takes about ten milliseconds and costs nothing.

Whether something is missing is decided at stage five, by looking at the priced
cart. An option group carries a minimum, so a meal that needs exactly one drink
is data rather than a judgement — and the question the customer gets is
specific, with buttons, instead of "could you clarify?".

## What it measures

29 hand-written cases run through the real pipeline on every push:

| | |
| --- | --- |
| Exact cart match | 29/29 |
| Finished without a model call | 29/29 |
| Slowest deterministic case | 11 ms |

The set is written by hand and never generated. A test set produced by the same
kind of model the system uses measures agreement, not correctness. It scores the
resulting cart rather than the wording, so replies are free to change and the
order is not.

It also carries a must-not-refuse list: "is anything half price today?", "can I
collect at 1800", "I'll pay cash". My earlier safety rules refused all three. An
attack that gets through is a bug; a customer who gets refused is a lost order.

## The engineering underneath

Three things run the system, and each lives in exactly one file.

**One rule sets every price:** base price plus the deltas of the chosen options,
times quantity. Customers and the assistant may only say which options were
chosen. A client that sends its own price is ignored, and a test proves it.

**One table defines every legal status move**, and who may make it. Nothing else
assigns `order.status`, so a customer can cancel before the kitchen accepts and
not after — in the API, not just in the button.

**Orders are snapshots.** Names, options and prices are copied in at checkout, so
a price rise tomorrow never changes yesterday's receipt.

## What I would do next

Real photographs of real food rather than the placeholders. Email receipts.
And, once there is enough logged traffic to justify it, a small trained model
deciding when the fast path can be trusted — which would be the first time
machine learning in this project earned its place with data rather than with a
diagram.
