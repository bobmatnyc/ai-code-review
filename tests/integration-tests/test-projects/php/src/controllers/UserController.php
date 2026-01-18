<?php
require_once __DIR__ . '/../models/User.php';

class UserController {
    public function getUsers(): void {
        global $users;

        header('Content-Type: application/json');
        // Security issue: returning passwords
        echo json_encode($users);
    }

    public function getUserById(int $id): void {
        $user = findUserById($id);

        header('Content-Type: application/json');

        if ($user === null) {
            http_response_code(404);
            echo json_encode(['message' => 'User not found']);
            return;
        }

        // Security issue: returning password
        echo json_encode($user);
    }

    public function addUser(): void {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if ($data === null) {
                throw new Exception('Invalid JSON');
            }

            // Missing validation

            global $users;
            $newId = count($users) + 1;

            $newUser = [
                'id' => $newId,
                'name' => $data['name'] ?? '',
                'email' => $data['email'] ?? '',
                'password' => $data['password'] ?? '',  // Security issue: password not hashed
                'created_at' => date('c')
            ];

            $user = createUser($newUser);

            header('Content-Type: application/json');
            http_response_code(201);
            echo json_encode($user);
        } catch (Exception $e) {
            // Bad error handling (not specific)
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode(['message' => 'Error creating user']);
        }
    }

    // Unused method
    public function formatUserData(array $user): array {
        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'joined' => $user['created_at']
        ];
    }
}
