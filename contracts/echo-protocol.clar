;; title: echo-protocol
;; version: 1.0.0
;; summary: Echo Protocol - Bulk Message and Transfer System
;; description: A protocol for bulk messaging and token transfers with echo functionality

;; Echo Protocol Contract
;; Enables bulk operations for messaging and token transfers

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-INVALID-PARAMS (err u402))
(define-constant ERR-INSUFFICIENT-BALANCE (err u403))
(define-constant ERR-INVALID-RECIPIENT (err u404))
(define-constant ERR-LIMIT-EXCEEDED (err u405))

;; Maximum operations per bulk transaction
(define-constant MAX-BULK-MESSAGES u20)
(define-constant MAX-BULK-TRANSFERS u15)
(define-constant MAX-BULK-ECHOS u25)

;; Data Maps
(define-map user-messages
  { user: principal, message-id: uint }
  {
    content: (string-ascii 500),
    timestamp: uint,
    sender: principal,
    is-read: bool
  }
)

(define-map user-balances principal uint)

(define-map echo-chains
  { echo-id: uint }
  {
    original-message: (string-ascii 500),
    echo-count: uint,
    last-echo: uint,
    creator: principal
  }
)

(define-map bulk-operation-logs
  { operation-id: uint }
  {
    operation-type: (string-ascii 20),
    total-operations: uint,
    timestamp: uint,
    initiator: principal
  }
)

;; Data Variables
(define-data-var next-message-id uint u1)
(define-data-var next-echo-id uint u1)
(define-data-var next-operation-id uint u1)
(define-data-var protocol-paused bool false)

;; Initialize user balance
(define-public (initialize-balance)
  (begin
    (asserts! (is-eq (default-to u0 (map-get? user-balances tx-sender)) u0) ERR-INVALID-PARAMS)
    (map-set user-balances tx-sender u1000000) ;; 1 STX in microSTX
    (ok true)
  )
)

;; ============================================
;; BULK MESSAGE OPERATIONS
;; ============================================

;; Struct for bulk message parameters
(define-map message-params
  { message-id: uint }
  {
    recipient: principal,
    content: (string-ascii 500)
  }
)

;; Send bulk messages (up to 20 messages per transaction)
(define-public (bulk-send-messages (messages (list 20 {
    recipient: principal,
    content: (string-ascii 500)
})))
  (let (
      (total-messages (len messages))
      (operation-id (var-get next-operation-id))
    )
    (asserts! (not (var-get protocol-paused)) ERR-UNAUTHORIZED)
    (asserts! (> total-messages u0) ERR-INVALID-PARAMS)
    (asserts! (<= total-messages MAX-BULK-MESSAGES) ERR-LIMIT-EXCEEDED)

    ;; Process all messages
    (let ((result (process-bulk-messages messages operation-id)))
      (var-set next-operation-id (+ operation-id u1))

      ;; Log bulk operation
      (map-set bulk-operation-logs
        { operation-id: operation-id }
        {
          operation-type: "bulk-messages",
          total-operations: total-messages,
          timestamp: stacks-block-time,
          initiator: tx-sender
        }
      )

      (print {
        event: "bulk-messages-sent",
        operation-id: operation-id,
        total-messages: total-messages,
        timestamp: stacks-block-time
      })

      (ok {
        operation-id: operation-id,
        total-messages: total-messages
      })
    )
  )
)

;; Helper function to process bulk messages
(define-private (process-bulk-messages (messages (list 20 {
    recipient: principal,
    content: (string-ascii 500)
})) (operation-id uint))
  (let (
      (message-id (var-get next-message-id))
    )
    (map process-single-message messages)
    (var-set next-message-id (+ message-id (len messages)))
    true
  )
)

;; Process single message
(define-private (process-single-message (message-data {
    recipient: principal,
    content: (string-ascii 500)
}))
  (let (
      (current-id (var-get next-message-id))
    )
    (map-set user-messages
      { user: (get recipient message-data), message-id: current-id }
      {
        content: (get content message-data),
        timestamp: stacks-block-time,
        sender: tx-sender,
        is-read: false
      }
    )
    (var-set next-message-id (+ current-id u1))
    true
  )
)

;; Bulk read messages (mark as read)
(define-public (bulk-mark-messages-read (message-ids (list 20 uint)))
  (let (
      (total-messages (len message-ids))
      (operation-id (var-get next-operation-id))
    )
    (asserts! (not (var-get protocol-paused)) ERR-UNAUTHORIZED)
    (asserts! (> total-messages u0) ERR-INVALID-PARAMS)
    (asserts! (<= total-messages MAX-BULK-MESSAGES) ERR-LIMIT-EXCEEDED)

    ;; Process all message reads
    (let ((result (process-bulk-reads message-ids operation-id)))
      (var-set next-operation-id (+ operation-id u1))

      ;; Log bulk operation
      (map-set bulk-operation-logs
        { operation-id: operation-id }
        {
          operation-type: "bulk-reads",
          total-operations: total-messages,
          timestamp: stacks-block-time,
          initiator: tx-sender
        }
      )

      (print {
        event: "bulk-messages-read",
        operation-id: operation-id,
        total-messages: total-messages,
        timestamp: stacks-block-time
      })

      (ok {
        operation-id: operation-id,
        total-messages: total-messages
      })
    )
  )
)

;; Helper function to process bulk reads
(define-private (process-bulk-reads (message-ids (list 20 uint)) (operation-id uint))
  (begin
    (map mark-single-message-read message-ids)
    true
  )
)

;; Mark single message as read
(define-private (mark-single-message-read (message-id uint))
  (let (
      (message (unwrap! (map-get? user-messages { user: tx-sender, message-id: message-id }) false))
    )
    (if (is-some (map-get? user-messages { user: tx-sender, message-id: message-id }))
      (map-set user-messages
        { user: tx-sender, message-id: message-id }
        (merge message { is-read: true })
      )
      false
    )
  )
)

;; ============================================
;; BULK TRANSFER OPERATIONS
;; ============================================

;; Struct for bulk transfer parameters
(define-map transfer-params
  { transfer-id: uint }
  {
    recipient: principal,
    amount: uint
  }
)

;; Bulk token transfers (up to 15 transfers per transaction)
(define-public (bulk-transfer-tokens (transfers (list 15 {
    recipient: principal,
    amount: uint
})))
  (let (
      (total-transfers (len transfers))
      (operation-id (var-get next-operation-id))
      (total-amount (fold + u0 (map get-transfer-amount transfers)))
    )
    (asserts! (not (var-get protocol-paused)) ERR-UNAUTHORIZED)
    (asserts! (> total-transfers u0) ERR-INVALID-PARAMS)
    (asserts! (<= total-transfers MAX-BULK-TRANSFERS) ERR-LIMIT-EXCEEDED)

    ;; Check sender has sufficient balance
    (asserts! (>= (default-to u0 (map-get? user-balances tx-sender)) total-amount) ERR-INSUFFICIENT-BALANCE)

    ;; Process all transfers
    (let ((result (process-bulk-transfers transfers operation-id)))
      ;; Update sender balance
      (map-set user-balances tx-sender (- (default-to u0 (map-get? user-balances tx-sender)) total-amount))

      (var-set next-operation-id (+ operation-id u1))

      ;; Log bulk operation
      (map-set bulk-operation-logs
        { operation-id: operation-id }
        {
          operation-type: "bulk-transfers",
          total-operations: total-transfers,
          timestamp: stacks-block-time,
          initiator: tx-sender
        }
      )

      (print {
        event: "bulk-transfers-completed",
        operation-id: operation-id,
        total-transfers: total-transfers,
        total-amount: total-amount,
        timestamp: stacks-block-time
      })

      (ok {
        operation-id: operation-id,
        total-transfers: total-transfers,
        total-amount: total-amount
      })
    )
  )
)

;; Helper functions for bulk transfers
(define-private (process-bulk-transfers (transfers (list 15 {
    recipient: principal,
    amount: uint
})) (operation-id uint))
  (begin
    (map process-single-transfer transfers)
    true
  )
)

(define-private (process-single-transfer (transfer-data {
    recipient: principal,
    amount: uint
}))
  (let (
      (recipient (get recipient transfer-data))
      (amount (get amount transfer-data))
      (current-balance (default-to u0 (map-get? user-balances recipient)))
    )
    (asserts! (not (is-eq recipient tx-sender)) ERR-INVALID-RECIPIENT)
    (map-set user-balances recipient (+ current-balance amount))
    true
  )
)

(define-private (get-transfer-amount (transfer-data {
    recipient: principal,
    amount: uint
}))
  (get amount transfer-data)
)

;; ============================================
;; BULK ECHO OPERATIONS
;; ============================================

;; Bulk create echo chains (up to 25 echoes per transaction)
(define-public (bulk-create-echoes (echoes (list 25 {
    original-message: (string-ascii 500)
})))
  (let (
      (total-echoes (len echoes))
      (operation-id (var-get next-operation-id))
    )
    (asserts! (not (var-get protocol-paused)) ERR-UNAUTHORIZED)
    (asserts! (> total-echoes u0) ERR-INVALID-PARAMS)
    (asserts! (<= total-echoes MAX-BULK-ECHOS) ERR-LIMIT-EXCEEDED)

    ;; Process all echoes
    (let ((result (process-bulk-echoes echoes operation-id)))
      (var-set next-operation-id (+ operation-id u1))

      ;; Log bulk operation
      (map-set bulk-operation-logs
        { operation-id: operation-id }
        {
          operation-type: "bulk-echoes",
          total-operations: total-echoes,
          timestamp: stacks-block-time,
          initiator: tx-sender
        }
      )

      (print {
        event: "bulk-echoes-created",
        operation-id: operation-id,
        total-echoes: total-echoes,
        timestamp: stacks-block-time
      })

      (ok {
        operation-id: operation-id,
        total-echoes: total-echoes
      })
    )
  )
)

;; Helper function to process bulk echoes
(define-private (process-bulk-echoes (echoes (list 25 {
    original-message: (string-ascii 500)
})) (operation-id uint))
  (let (
      (echo-id (var-get next-echo-id))
    )
    (map process-single-echo echoes)
    (var-set next-echo-id (+ echo-id (len echoes)))
    true
  )
)

;; Process single echo
(define-private (process-single-echo (echo-data {
    original-message: (string-ascii 500)
}))
  (let (
      (current-id (var-get next-echo-id))
    )
    (map-set echo-chains
      { echo-id: current-id }
      {
        original-message: (get original-message echo-data),
        echo-count: u1,
        last-echo: stacks-block-time,
        creator: tx-sender
      }
    )
    (var-set next-echo-id (+ current-id u1))
    true
  )
)

;; ============================================
;; UTILITY FUNCTIONS
;; ============================================

;; Get bulk operation limits
(define-read-only (get-bulk-limits)
  {
    max-messages: MAX-BULK-MESSAGES,
    max-transfers: MAX-BULK-TRANSFERS,
    max-echoes: MAX-BULK-ECHOS
  }
)

;; Get user balance
(define-read-only (get-user-balance (user principal))
  (default-to u0 (map-get? user-balances user))
)

;; Get message details
(define-read-only (get-message (user principal) (message-id uint))
  (map-get? user-messages { user: user, message-id: message-id })
)

;; Get echo chain details
(define-read-only (get-echo-chain (echo-id uint))
  (map-get? echo-chains { echo-id: echo-id })
)

;; Get bulk operation details
(define-read-only (get-bulk-operation (operation-id uint))
  (map-get? bulk-operation-logs { operation-id: operation-id })
)

;; Estimate gas for bulk operations
(define-read-only (estimate-bulk-gas (operation-count uint) (operation-type (string-ascii 20)))
  (let (
      (base-gas u21000)
      (gas-per-operation (if (is-eq operation-type "messages") u15000
                           (if (is-eq operation-type "transfers") u20000
                             (if (is-eq operation-type "echoes") u12000 u25000))))
    )
    (+ base-gas (* gas-per-operation operation-count))
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Pause/unpause protocol
(define-public (set-protocol-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (var-set protocol-paused paused)
    (ok paused)
  )
)

;; Get protocol status
(define-read-only (get-protocol-status)
  {
    paused: (var-get protocol-paused),
    next-message-id: (var-get next-message-id),
    next-echo-id: (var-get next-echo-id),
    next-operation-id: (var-get next-operation-id)
  }
)
