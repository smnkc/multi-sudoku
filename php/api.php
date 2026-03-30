<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't break JSON with PHP errors

$action = $_POST['action'] ?? '';
$dataDir = __DIR__ . '/../data';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

function generateCode($length = 5) {
    return substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, $length);
}

function cleanupOldRooms($dir, $maxAgeHours = 1) {
    if (!is_dir($dir)) return;
    $files = glob($dir . '/*.json');
    $now = time();
    foreach ($files as $file) {
        if (is_file($file)) {
            // Delete files older than $maxAgeHours
            if ($now - filemtime($file) >= $maxAgeHours * 3600) {
                @unlink($file);
            }
        }
    }
}

function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    switch ($action) {
        case 'create_room':
            $difficulty = $_POST['difficulty'] ?? 'easy';
            $board = json_decode($_POST['board'] ?? '[]');
            $solution = json_decode($_POST['solution'] ?? '[]');
            $playerId = $_POST['player_id'] ?? '';

            if (!$playerId || empty($board) || empty($solution)) {
                sendJson(['error' => 'Missing data'], 400);
            }

            // Temizlik işlemi: 1 saatten eski odaları sil (Hostun şişmemesi için)
            cleanupOldRooms($dataDir, 1);

            // Generate unique code
            $code = '';
            do {
                $code = generateCode();
                $file = $dataDir . '/' . $code . '.json';
            } while (file_exists($file));

            $state = [
                'code' => $code,
                'difficulty' => $difficulty,
                'board' => $board,
                'solution' => $solution,
                'status' => 'waiting', // waiting for player 2
                'winner' => null,
                'players' => [
                    $playerId => [
                        'progress' => [],
                        'finished' => false,
                        'name' => 'Player 1',
                        'last_active' => time()
                    ]
                ]
            ];

            file_put_contents($file, json_encode($state, JSON_PRETTY_PRINT));
            sendJson(['success' => true, 'code' => $code, 'state' => $state]);
            break;

        case 'join_room':
            $code = strtoupper($_POST['code'] ?? '');
            $playerId = $_POST['player_id'] ?? '';
            $file = $dataDir . '/' . $code . '.json';

            if (!file_exists($file)) {
                sendJson(['error' => 'Oda bulunamadı (Room not found)'], 404);
            }

            $state = json_decode(file_get_contents($file), true);

            if (!isset($state['players'][$playerId])) {
                if (count($state['players']) >= 2) {
                    sendJson(['error' => 'Oda dolu (Room is full)'], 403);
                }
                
                // Add Player 2
                $state['players'][$playerId] = [
                    'progress' => [],
                    'finished' => false,
                    'name' => 'Player 2',
                    'last_active' => time()
                ];
                $state['status'] = 'playing';
                file_put_contents($file, json_encode($state, JSON_PRETTY_PRINT));
            } else {
                // Update last active if already in room
                $state['players'][$playerId]['last_active'] = time();
                file_put_contents($file, json_encode($state, JSON_PRETTY_PRINT));
            }

            sendJson(['success' => true, 'state' => $state]);
            break;

        case 'update':
            $code = strtoupper($_POST['code'] ?? '');
            $playerId = $_POST['player_id'] ?? '';
            $progress = json_decode($_POST['progress'] ?? '[]');
            $finished = filter_var($_POST['finished'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
            $lost = filter_var($_POST['lost'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

            $file = $dataDir . '/' . $code . '.json';

            if (!file_exists($file)) {
                sendJson(['error' => 'Oda bulunamadı (Room not found)'], 404);
            }

            // Simple file lock simulation for concurrent updates
            $fp = fopen($file, 'c+');
            if (flock($fp, LOCK_EX)) {
                $fileSize = filesize($file);
                $state = [];
                if ($fileSize > 0) {
                    $jsonContent = fread($fp, $fileSize);
                    $state = json_decode($jsonContent, true);
                }

                if (isset($state['players'][$playerId])) {
                    $state['players'][$playerId]['progress'] = $progress;
                    $state['players'][$playerId]['finished'] = $finished;
                    $state['players'][$playerId]['last_active'] = time();

                    if ($finished && $state['status'] === 'playing' && $state['winner'] === null) {
                        $state['winner'] = $playerId;
                        $state['status'] = 'finished';
                        $state['win_reason'] = 'normal';
                    } else if ($lost && $state['status'] === 'playing' && $state['winner'] === null) {
                        // Find opponent
                        $otherPlayerId = 'nobody';
                        foreach ($state['players'] as $pid => $pdata) {
                            if ($pid !== $playerId) {
                                $otherPlayerId = $pid;
                                break;
                            }
                        }
                        $state['winner'] = $otherPlayerId;
                        $state['status'] = 'finished';
                        $state['win_reason'] = 'mistakes';
                    }

                    ftruncate($fp, 0);
                    rewind($fp);
                    fwrite($fp, json_encode($state, JSON_PRETTY_PRINT));
                    fflush($fp);
                }
                flock($fp, LOCK_UN);
            }
            fclose($fp);

            // Fetch the updated file contents again to return
            $currentState = json_decode(file_get_contents($file), true);
            sendJson(['success' => true, 'state' => $currentState]);
            break;

        case 'poll':
            $code = strtoupper($_POST['code'] ?? '');
            $playerId = $_POST['player_id'] ?? '';
            $file = $dataDir . '/' . $code . '.json';

            if (!file_exists($file)) {
                sendJson(['error' => 'Oda bulunamadı (Room not found)'], 404);
            }

            $fp = fopen($file, 'c+');
            $state = [];
            if ($fp && flock($fp, LOCK_EX)) {
                $fileSize = filesize($file);
                if ($fileSize > 0) {
                    $jsonContent = fread($fp, $fileSize);
                    $state = json_decode($jsonContent, true);
                }

                if (isset($state['players'][$playerId])) {
                    $state['players'][$playerId]['last_active'] = time();
                    
                    // Check if opponent timed out (15 seconds)
                    if ($state['status'] === 'playing' && $state['winner'] === null) {
                        foreach ($state['players'] as $pid => $pdata) {
                            if ($pid !== $playerId) {
                                if (time() - ($pdata['last_active'] ?? 0) > 15) {
                                    $state['winner'] = $playerId;
                                    $state['status'] = 'finished';
                                    $state['win_reason'] = 'abandon';
                                }
                            }
                        }
                    }

                    ftruncate($fp, 0);
                    rewind($fp);
                    fwrite($fp, json_encode($state, JSON_PRETTY_PRINT));
                    fflush($fp);
                }
                flock($fp, LOCK_UN);
                fclose($fp);
            }
            // Fetch updated
            $state = json_decode(file_get_contents($file), true);
            sendJson(['success' => true, 'state' => $state]);
            break;

        case 'delete_room':
            $code = strtoupper($_POST['code'] ?? '');
            $file = $dataDir . '/' . $code . '.json';
            if (file_exists($file)) {
                @unlink($file);
            }
            sendJson(['success' => true]);
            break;

        default:
            sendJson(['error' => 'Unknown action'], 400);
            break;
    }
} catch (Exception $e) {
    sendJson(['error' => 'Server error: ' . $e->getMessage()], 500);
}
