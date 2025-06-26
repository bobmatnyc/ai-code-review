<?php
require_once __DIR__ . '/../src/controllers/UserController.php';

// Deliberately use global variable (not best practice) for test
 = true;

// Simple routing
 = parse_url(['REQUEST_URI'], PHP_URL_PATH);
 = ['REQUEST_METHOD'];

// Create controller instance
 = new UserController();

// Routes
if ( === '/api/users' &&  === 'GET') {
    ->getUsers();
} elseif (preg_match('/\/api\/users\/(\d+)/', , ) &&  === 'GET') {
     = (int) [1];
    ->getUserById();
} elseif ( === '/api/users' &&  === 'POST') {
    ->addUser();
} elseif ( === '/api/status') {
    // Bug: header already sent
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok']);
    echo "API is running";  // Bug: Additional output after JSON
} else {
    header('HTTP/1.1 404 Not Found');
    echo json_encode(['message' => 'Route not found']);
}

// Unused function (for testing unused code detection)
function calculateSomething(, ) {
    return  * ;
}
