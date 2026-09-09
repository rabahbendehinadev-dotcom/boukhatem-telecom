---
name: Order idempotency lock ordering
description: Concurrency rule for order creation when cart contents and stock are mutable.
---

Acquire the transaction-scoped idempotency lock and recheck for an existing order before loading the cart, resolving catalog items, or validating stock.

**Why:** An outside-transaction validation can miss an in-flight order, wait behind its stock lock, then incorrectly fail on the winner's depleted stock or deleted cart instead of returning the existing order.

**How to apply:** For guest and authenticated checkout paths, keep canonical pricing, stock checks, decrement, order insertion, and cart deletion inside one transaction after the scoped idempotency lock.