import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;
const user3 = accounts.get("wallet_3")!;
const user4 = accounts.get("wallet_4")!;
const user5 = accounts.get("wallet_5")!;

const contractName = "echo-protocol";

// Helper to extract response values
function getResponseOk(result: any) {
  if (result.result.type === 7) { // ResponseOk
    return result.result.value;
  }
  throw new Error(`Expected ResponseOk, got ${result.result.type}`);
}

function getResponseErr(result: any) {
  if (result.result.type === 8) { // ResponseErr
    return result.result.value;
  }
  throw new Error(`Expected ResponseErr, got ${result.result.type}`);
}

// ════════════════════════════════════════════════════════════════════════════
// SETUP AND SINGLE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

describe("Echo Protocol - Bulk Operations Tests", () => {

  beforeEach(async () => {
    // Initialize balances for users
    simnet.callPublicFn(contractName, "initialize-balance", [], user1);
    simnet.callPublicFn(contractName, "initialize-balance", [], user2);
    simnet.callPublicFn(contractName, "initialize-balance", [], user3);
  });

  describe("Single Operations", () => {
    it("should initialize user balance", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "initialize-balance",
        [],
        user1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should get user balance", () => {
      simnet.callPublicFn(contractName, "initialize-balance", [], user1);

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-user-balance",
        [Cl.principal(user1)],
        user1
      );

      expect(result).toBeUint(1000000); // 1 STX in microSTX
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BULK MESSAGE OPERATIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Bulk Message Operations", () => {
    it("should bulk send messages successfully", () => {
      const messages = [
        { recipient: user2, content: "Hello from user1!" },
        { recipient: user3, content: "Greetings user3!" },
        { recipient: user2, content: "Another message to user2" }
      ];

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list(messages.map(msg => Cl.tuple({
          'recipient': Cl.principal(msg.recipient),
          'content': Cl.stringAscii(msg.content)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-messages": Cl.uint(3)
      }));
    });

    it("should handle maximum bulk messages (20 messages)", () => {
      const messages = Array.from({length: 20}, (_, i) => ({
        recipient: i % 2 === 0 ? user2 : user3,
        content: `Message ${i + 1} from bulk test`
      }));

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list(messages.map(msg => Cl.tuple({
          'recipient': Cl.principal(msg.recipient),
          'content': Cl.stringAscii(msg.content)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-messages": Cl.uint(20)
      }));
    });

    it("should reject bulk messages exceeding limit", () => {
      const messages = Array.from({length: 21}, (_, i) => ({
        recipient: user2,
        content: `Message ${i + 1}`
      }));

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list(messages.map(msg => Cl.tuple({
          'recipient': Cl.principal(msg.recipient),
          'content': Cl.stringAscii(msg.content)
        })))],
        user1
      );

      expect(result).toBeErr(Cl.uint(405)); // ERR-LIMIT-EXCEEDED
    });

    it("should reject empty bulk message list", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([])],
        user1
      );

      expect(result).toBeErr(Cl.uint(402)); // ERR-INVALID-PARAMS
    });

    it("should bulk mark messages as read", () => {
      // First send some messages
      simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([
          Cl.tuple({
            'recipient': Cl.principal(user1),
            'content': Cl.stringAscii("Message 1")
          }),
          Cl.tuple({
            'recipient': Cl.principal(user1),
            'content': Cl.stringAscii("Message 2")
          })
        ])],
        user2
      );

      // Mark them as read
      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-mark-messages-read",
        [Cl.list([Cl.uint(1), Cl.uint(2)])],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(2),
        "total-messages": Cl.uint(2)
      }));
    });

    it("should reject bulk read when protocol is paused", () => {
      // Pause protocol
      simnet.callPublicFn(contractName, "set-protocol-paused", [Cl.bool(true)], deployer);

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-mark-messages-read",
        [Cl.list([Cl.uint(1)])],
        user1
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR-UNAUTHORIZED (paused)
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BULK TRANSFER OPERATIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Bulk Transfer Operations", () => {
    it("should bulk transfer tokens successfully", () => {
      const transfers = [
        { recipient: user2, amount: 100000 }, // 0.1 STX
        { recipient: user3, amount: 200000 }, // 0.2 STX
        { recipient: user4, amount: 150000 }  // 0.15 STX
      ];

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-transfers": Cl.uint(3),
        "total-amount": Cl.uint(450000)
      }));
    });

    it("should handle maximum bulk transfers (15 transfers)", () => {
      const transfers = Array.from({length: 15}, (_, i) => ({
        recipient: [user2, user3, user4][i % 3],
        amount: 10000 + (i * 1000) // Varying amounts
      }));

      const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-transfers": Cl.uint(15),
        "total-amount": Cl.uint(totalAmount)
      }));
    });

    it("should reject bulk transfers exceeding limit", () => {
      const transfers = Array.from({length: 16}, (_, i) => ({
        recipient: user2,
        amount: 10000
      }));

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      expect(result).toBeErr(Cl.uint(405)); // ERR-LIMIT-EXCEEDED
    });

    it("should reject bulk transfers with insufficient balance", () => {
      const transfers = [
        { recipient: user2, amount: 2000000 } // More than user1's balance
      ];

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      expect(result).toBeErr(Cl.uint(403)); // ERR-INSUFFICIENT-BALANCE
    });

    it("should reject transfers to self", () => {
      const transfers = [
        { recipient: user1, amount: 100000 } // Transfer to self
      ];

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      expect(result).toBeErr(Cl.uint(404)); // ERR-INVALID-RECIPIENT
    });

    it("should update balances correctly after bulk transfers", () => {
      const transfers = [
        { recipient: user2, amount: 100000 },
        { recipient: user3, amount: 200000 }
      ];

      simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list(transfers.map(transfer => Cl.tuple({
          'recipient': Cl.principal(transfer.recipient),
          'amount': Cl.uint(transfer.amount)
        })))],
        user1
      );

      // Check balances
      const user1Balance = simnet.callReadOnlyFn(contractName, "get-user-balance", [Cl.principal(user1)], user1);
      const user2Balance = simnet.callReadOnlyFn(contractName, "get-user-balance", [Cl.principal(user2)], user2);
      const user3Balance = simnet.callReadOnlyFn(contractName, "get-user-balance", [Cl.principal(user3)], user3);

      expect(user1Balance.result).toBeUint(1000000 - 300000); // 700000
      expect(user2Balance.result).toBeUint(1000000 + 100000); // 1100000
      expect(user3Balance.result).toBeUint(1000000 + 200000); // 1200000
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BULK ECHO OPERATIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Bulk Echo Operations", () => {
    it("should bulk create echoes successfully", () => {
      const echoes = [
        { originalMessage: "First echo message" },
        { originalMessage: "Second echo in chain" },
        { originalMessage: "Third echo message" }
      ];

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list(echoes.map(echo => Cl.tuple({
          'original-message': Cl.stringAscii(echo.originalMessage)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-echoes": Cl.uint(3)
      }));
    });

    it("should handle maximum bulk echoes (25 echoes)", () => {
      const echoes = Array.from({length: 25}, (_, i) => ({
        originalMessage: `Echo message ${i + 1} in bulk operation`
      }));

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list(echoes.map(echo => Cl.tuple({
          'original-message': Cl.stringAscii(echo.originalMessage)
        })))],
        user1
      );

      expect(result).toBeOk(Cl.tuple({
        "operation-id": Cl.uint(1),
        "total-echoes": Cl.uint(25)
      }));
    });

    it("should reject bulk echoes exceeding limit", () => {
      const echoes = Array.from({length: 26}, (_, i) => ({
        originalMessage: `Echo ${i + 1}`
      }));

      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list(echoes.map(echo => Cl.tuple({
          'original-message': Cl.stringAscii(echo.originalMessage)
        })))],
        user1
      );

      expect(result).toBeErr(Cl.uint(405)); // ERR-LIMIT-EXCEEDED
    });

    it("should reject empty bulk echo list", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list([])],
        user1
      );

      expect(result).toBeErr(Cl.uint(402)); // ERR-INVALID-PARAMS
    });

    it("should create echo chains with correct data", () => {
      const echoes = [
        { originalMessage: "Test echo message" }
      ];

      simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list(echoes.map(echo => Cl.tuple({
          'original-message': Cl.stringAscii(echo.originalMessage)
        })))],
        user1
      );

      // Check echo chain data
      const echoData = simnet.callReadOnlyFn(contractName, "get-echo-chain", [Cl.uint(1)], user1);

      expect(echoData.result).toBeSome();
      const echoTuple = echoData.result.expectSome().expectTuple();
      expect(echoTuple['original-message']).toBe("Test echo message");
      expect(echoTuple['echo-count']).toBe(Cl.uint(1));
      expect(echoTuple['creator']).toBe(user1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Utility Functions", () => {
    it("should get bulk limits correctly", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-bulk-limits",
        [],
        user1
      );

      const limits = result.expectTuple();
      expect(limits['max-messages']).toBeUint(20);
      expect(limits['max-transfers']).toBeUint(15);
      expect(limits['max-echoes']).toBeUint(25);
    });

    it("should estimate gas for different operation types", () => {
      // Test message gas estimation
      const messageGas = simnet.callReadOnlyFn(
        contractName,
        "estimate-bulk-gas",
        [Cl.uint(5), Cl.stringAscii("messages")],
        user1
      );
      expect(messageGas.result).toBeUint(21000 + (15000 * 5)); // 96000

      // Test transfer gas estimation
      const transferGas = simnet.callReadOnlyFn(
        contractName,
        "estimate-bulk-gas",
        [Cl.uint(3), Cl.stringAscii("transfers")],
        user1
      );
      expect(transferGas.result).toBeUint(21000 + (20000 * 3)); // 81000

      // Test echo gas estimation
      const echoGas = simnet.callReadOnlyFn(
        contractName,
        "estimate-bulk-gas",
        [Cl.uint(10), Cl.stringAscii("echoes")],
        user1
      );
      expect(echoGas.result).toBeUint(21000 + (12000 * 10)); // 141000
    });

    it("should get protocol status", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-protocol-status",
        [],
        user1
      );

      const status = result.expectTuple();
      expect(status['paused']).toBe(Cl.bool(false));
      expect(status['next-message-id']).toBeUint(1);
      expect(status['next-echo-id']).toBeUint(1);
      expect(status['next-operation-id']).toBeUint(1);
    });

    it("should get bulk operation details", () => {
      // Create a bulk operation first
      simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([
          Cl.tuple({
            'recipient': Cl.principal(user2),
            'content': Cl.stringAscii("Test message")
          })
        ])],
        user1
      );

      const operationData = simnet.callReadOnlyFn(
        contractName,
        "get-bulk-operation",
        [Cl.uint(1)],
        user1
      );

      expect(operationData.result).toBeSome();
      const operationTuple = operationData.result.expectSome().expectTuple();
      expect(operationTuple['operation-type']).toBe("bulk-messages");
      expect(operationTuple['total-operations']).toBeUint(1);
      expect(operationTuple['initiator']).toBe(user1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN FUNCTIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Admin Functions", () => {
    it("should allow owner to pause/unpause protocol", () => {
      // Pause protocol
      const pauseResult = simnet.callPublicFn(
        contractName,
        "set-protocol-paused",
        [Cl.bool(true)],
        deployer
      );
      expect(pauseResult.result).toBeOk(Cl.bool(true));

      // Check status
      const statusResult = simnet.callReadOnlyFn(
        contractName,
        "get-protocol-status",
        [],
        user1
      );
      expect(statusResult.result.expectTuple()['paused']).toBe(Cl.bool(true));

      // Unpause protocol
      const unpauseResult = simnet.callPublicFn(
        contractName,
        "set-protocol-paused",
        [Cl.bool(false)],
        deployer
      );
      expect(unpauseResult.result).toBeOk(Cl.bool(false));
    });

    it("should reject non-owner from pausing protocol", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "set-protocol-paused",
        [Cl.bool(true)],
        user1
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR-UNAUTHORIZED
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("Bulk Operations Integration", () => {
    it("should handle complete bulk workflow", () => {
      // 1. Bulk send messages
      simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([
          Cl.tuple({
            'recipient': Cl.principal(user1),
            'content': Cl.stringAscii("Integration test message")
          })
        ])],
        user2
      );

      // 2. Bulk mark messages as read
      simnet.callPublicFn(
        contractName,
        "bulk-mark-messages-read",
        [Cl.list([Cl.uint(1)])],
        user1
      );

      // 3. Bulk transfer tokens
      simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list([
          Cl.tuple({
            'recipient': Cl.principal(user2),
            'amount': Cl.uint(50000)
          })
        ])],
        user1
      );

      // 4. Bulk create echoes
      simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list([
          Cl.tuple({
            'original-message': Cl.stringAscii("Integration test echo")
          })
        ])],
        user1
      );

      // Verify operation IDs increment correctly
      const status = simnet.callReadOnlyFn(
        contractName,
        "get-protocol-status",
        [],
        user1
      ).result.expectTuple();

      expect(status['next-operation-id']).toBeUint(5); // Started at 1, did 4 operations
    });

    it("should maintain data consistency across bulk operations", () => {
      // Bulk messages
      simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([
          Cl.tuple({
            'recipient': Cl.principal(user2),
            'content': Cl.stringAscii("Consistency test")
          })
        ])],
        user1
      );

      // Verify message data
      const messageData = simnet.callReadOnlyFn(
        contractName,
        "get-message",
        [Cl.principal(user2), Cl.uint(1)],
        user2
      );

      expect(messageData.result).toBeSome();
      const messageTuple = messageData.result.expectSome().expectTuple();
      expect(messageTuple['content']).toBe("Consistency test");
      expect(messageTuple['sender']).toBe(user1);
      expect(messageTuple['is-read']).toBe(Cl.bool(false));

      // Bulk mark as read
      simnet.callPublicFn(
        contractName,
        "bulk-mark-messages-read",
        [Cl.list([Cl.uint(1)])],
        user2
      );

      // Verify read status updated
      const updatedMessageData = simnet.callReadOnlyFn(
        contractName,
        "get-message",
        [Cl.principal(user2), Cl.uint(1)],
        user2
      );

      const updatedMessageTuple = updatedMessageData.result.expectSome().expectTuple();
      expect(updatedMessageTuple['is-read']).toBe(Cl.bool(true));
    });

    it("should handle mixed bulk operation types efficiently", () => {
      // Bulk transfers
      simnet.callPublicFn(
        contractName,
        "bulk-transfer-tokens",
        [Cl.list([
          Cl.tuple({'recipient': Cl.principal(user2), 'amount': Cl.uint(100000)}),
          Cl.tuple({'recipient': Cl.principal(user3), 'amount': Cl.uint(150000)})
        ])],
        user1
      );

      // Bulk echoes
      simnet.callPublicFn(
        contractName,
        "bulk-create-echoes",
        [Cl.list([
          Cl.tuple({'original-message': Cl.stringAscii("Mixed operation echo 1")}),
          Cl.tuple({'original-message': Cl.stringAscii("Mixed operation echo 2")})
        ])],
        user1
      );

      // Bulk messages
      simnet.callPublicFn(
        contractName,
        "bulk-send-messages",
        [Cl.list([
          Cl.tuple({'recipient': Cl.principal(user2), 'content': Cl.stringAscii("Mixed operation message")})
        ])],
        user1
      );

      // Verify all operations completed and IDs are correct
      const status = simnet.callReadOnlyFn(
        contractName,
        "get-protocol-status",
        [],
        user1
      ).result.expectTuple();

      expect(status['next-message-id']).toBeUint(2); // 1 message sent
      expect(status['next-echo-id']).toBeUint(3); // 2 echoes created
      expect(status['next-operation-id']).toBeUint(4); // 3 operations performed
    });
  });
});
