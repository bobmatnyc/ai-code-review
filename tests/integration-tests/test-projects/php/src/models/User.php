<?php

class User {
    public int $id;
    public string $name;
    public string $email;
    public string $password;  // Security issue: storing password unencrypted
    public string $createdAt;

    public function __construct(int $id, string $name, string $email, string $password, string $createdAt) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->password = $password;  // Security issue: password not hashed
        $this->createdAt = $createdAt;
    }

    public function toArray(): array {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password,  // Security issue: returning password
            'created_at' => $this->createdAt
        ];
    }
}

// Global array (not best practice)
$users = [
    [
        'id' => 1,
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',  // Security issue: hardcoded password
        'created_at' => '2023-04-15T10:00:00Z'
    ]
];

function findUserById(int $id): ?array {
    global $users;

    // Performance issue: using a loop instead of a more efficient lookup
    foreach ($users as $user) {
        if ($user['id'] === $id) {
            return $user;
        }
    }

    return null;
}

function createUser(array $user): array {
    global $users;

    // Missing validation

    // Security issue: No password hashing
    $users[] = $user;
    return $user;
}

// Unused function (for testing unused code detection)
function validateEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) \!== false;
}
