from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging
import json
from werkzeug.utils import safe_join

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

@dataclass
class Player:
    id: str
    name: str
    room_id: str
    color: str

@dataclass
class Room:
    id: str
    white_player: Optional[str] = None
    black_player: Optional[str] = None
    players: list = field(default_factory=list)
    game_state: str = 'waiting'  # waiting, playing, finished
    last_move: Optional[dict] = None
    moves: list = field(default_factory=list)

# Store active games and players
rooms: Dict[str, Room] = {}
players: Dict[str, Player] = {}

def generate_room_id():
    while True:
        room_id = ''.join(random.choices('0123456789', k=4))
        if room_id not in rooms:
            return room_id

def get_room_from_sid(sid):
    player = players.get(sid)
    if player:
        return rooms.get(player.room_id)
    return None

def get_opponent_sid(room, sid):
    if room.white_player and room.black_player:
        if sid == room.white_player:
            return room.black_player
        elif sid == room.black_player:
            return room.white_player
    return None

@app.route('/')
def index():
    logger.info("Serving index page")
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    try:
        # Use safe_join to prevent directory traversal
        safe_path = safe_join(app.static_folder, path)
        
        # Log the requested path and resolved safe path for debugging
        logging.info(f"Serving static file: Requested path = {path}, Safe path = {safe_path}")
        
        # Check if the file exists
        if not os.path.exists(safe_path):
            logging.warning(f"Static file not found: {safe_path}")
            return "File not found", 404
        
        return send_from_directory(app.static_folder, path)
    except Exception as e:
        logging.error(f"Error serving static file {path}: {str(e)}")
        return "Internal server error", 500

@app.route('/manifest.json')
def serve_manifest():
    logger.info("Serving manifest.json")
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/static/js/service-worker.js')
def serve_service_worker():
    logger.info("Serving service-worker.js")
    return send_from_directory('static/js', 'service-worker.js', mimetype='application/javascript')

@app.route('/img/chesspieces/wikipedia/<path:filename>')
def serve_chess_pieces(filename):
    try:
        # Construct the full path to the chess pieces directory
        chess_pieces_dir = os.path.join(app.static_folder, 'img', 'chesspieces', 'wikipedia')
        
        # Use safe_join to prevent directory traversal
        safe_path = safe_join(chess_pieces_dir, filename)
        
        # Log the requested path and resolved safe path for debugging
        logging.info(f"Serving chess piece: Requested filename = {filename}, Safe path = {safe_path}")
        
        # Check if the file exists
        if not os.path.exists(safe_path):
            logging.warning(f"Chess piece not found: {safe_path}")
            return "File not found", 404
        
        return send_from_directory(chess_pieces_dir, filename)
    except Exception as e:
        logging.error(f"Error serving chess piece {filename}: {str(e)}")
        return "Internal server error", 500

@app.route('/static/sounds/<path:filename>')
def serve_sound(filename):
    logger.info(f"Serving sound file: {filename}")
    try:
        return send_from_directory('static/sounds', filename)
    except Exception as e:
        logger.error(f"Error serving sound file {filename}: {e}")
        return '', 404

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_established', {'status': 'connected'})

@socketio.on('disconnect')
def on_disconnect():
    try:
        player_id = request.sid
        logger.info(f"Client disconnected: {player_id}")
        
        if player_id in players:
            player = players[player_id]
            room_id = player.room_id
            
            if room_id in rooms:
                room = rooms[room_id]
                
                # Remove player from room
                if player_id in room.players:
                    room.players.remove(player_id)
                
                # Update room state and notify others
                if player.color == 'white':
                    room.white_player = None
                    room.game_state = 'finished'  # End game if white player leaves
                else:
                    room.black_player = None
                
                # Notify other players
                emit('player_disconnected', {
                    'player': player.name,
                    'color': player.color,
                    'game_state': room.game_state
                }, room=room_id)
                
                # Clean up empty room after a delay
                if not room.players:
                    del rooms[room_id]
                
                leave_room(room_id)
            
            del players[player_id]
            
    except Exception as e:
        logger.error(f"Error in disconnect handler: {str(e)}")

@socketio.on('create_room')
def on_create_room(data):
    logger.info(f"Create room request: {data}")
    
    player_id = request.sid
    player_name = data.get('player_name', f"Player {len(players) + 1}")

    # Generate a unique room ID
    room_id = generate_room_id()
    
    # Create a new room
    room = Room(id=room_id)
    rooms[room_id] = room

    # Create player
    player = Player(player_id, player_name, room_id, 'white')
    players[player_id] = player

    # Add player to room
    room.white_player = player_id  # Store socket ID instead of name
    room.players.append(player_id)
    join_room(room_id)

    logger.info(f"Room created: {room_id} by {player_name}")

    # Emit room creation event to the creator
    emit('room_created', {
        'room_code': room_id,
        'player_color': 'white',
        'status': 'waiting'
    })

@socketio.on('join_room')
def on_join(data):
    logger.info(f"Join room request: {data}")
    
    room_id = data.get('room_id')
    player_id = request.sid
    player_name = data.get('player_name', f"Player {len(players) + 1}")

    if not room_id:
        emit('error', {'message': 'Room ID is required'})
        return

    if room_id not in rooms:
        emit('error', {'message': 'Room not found'})
        return

    room = rooms[room_id]

    # Check if room is full
    if len(room.players) >= 2:
        emit('error', {'message': 'Room is full'})
        return

    # Create player (black since white is creator)
    player = Player(player_id, player_name, room_id, 'black')
    players[player_id] = player

    # Add player to room
    room.black_player = player_id  # Store socket ID instead of name
    room.players.append(player_id)
    room.game_state = 'playing'
    join_room(room_id)

    logger.info(f"Player {player_name} joined room {room_id}")

    # Notify the joining player
    emit('room_joined', {
        'room_code': room_id,
        'player_color': 'black',
        'opponent': players[room.white_player].name,  # Get opponent's name from players dict
        'status': 'playing'
    })

    # Notify the room creator
    emit('opponent_joined', {
        'opponent': player_name,
        'status': 'playing'
    }, room=room.white_player)  # Send directly to white player's socket

@socketio.on('make_move')
def on_move(data):
    player_id = request.sid
    player = players.get(player_id)
    
    if not player or not player.room_id:
        logger.error(f"Invalid move attempt - player not in game: {player_id}")
        emit('error', {'message': 'Not in a game'})
        return
        
    room = rooms.get(player.room_id)
    if not room:
        logger.error(f"Invalid move attempt - room not found: {player.room_id}")
        emit('error', {'message': 'Game room not found'})
        return
    
    try:
        # Log the move
        logger.info(f"Move received - Room: {room.id}, Player: {player.name}, Color: {player.color}")
        logger.info(f"Move details: {data}")
        
        # Send move to all players in the room
        socketio.emit('chess_move', {
            'from': data['move']['from'],
            'to': data['move']['to'],
            'promotion': data['move'].get('promotion', 'q'),
            'player': player.name,
            'color': player.color
        }, room=player.room_id)
        
        logger.info("Move broadcast successful")
        
    except Exception as e:
        logger.error(f"Error processing move: {str(e)}")
        emit('error', {'message': 'Failed to process move'})

@socketio.on('game_over')
def on_game_over(data):
    logger.info(f"Game over: {data}")
    
    player_id = request.sid
    if player_id not in players:
        return

    player = players[player_id]
    room_id = player.room_id
    
    if room_id not in rooms:
        return

    room = rooms[room_id]
    room.game_state = 'finished'
    
    emit('game_ended', {
        'result': data.get('result', 'unknown'),
        'winner': data.get('winner'),
        'reason': data.get('reason', '')
    }, room=room_id)

@socketio.on('offer_draw')
def handle_draw_offer():
    try:
        player_id = request.sid
        player = players.get(player_id)
        
        if not player:
            logger.error("Player not found for draw offer")
            return
            
        room = rooms.get(player.room_id)
        if not room:
            logger.error("Room not found for draw offer")
            return
            
        # Get opponent's socket ID directly from room
        opponent_sid = room.black_player if player_id == room.white_player else room.white_player
        
        if opponent_sid:
            # Emit draw offer to opponent
            emit('draw_offered', room=opponent_sid)
            logger.info(f"Draw offer sent from {player_id} to {opponent_sid}")
        else:
            logger.error("Opponent not found for draw offer")
            
    except Exception as e:
        logger.error(f"Error in handle_draw_offer: {str(e)}")

@socketio.on('draw_response')
def handle_draw_response(data):
    try:
        player_id = request.sid
        player = players.get(player_id)
        
        if not player:
            logger.error("Player not found for draw response")
            return
            
        room = rooms.get(player.room_id)
        if not room:
            logger.error("Room not found for draw response")
            return
            
        # Get opponent's socket ID directly from room
        opponent_sid = room.black_player if player_id == room.white_player else room.white_player
        
        if opponent_sid:
            # Emit draw response to opponent
            emit('draw_response', data, room=opponent_sid)
            logger.info(f"Draw response sent from {player_id} to {opponent_sid}: {data}")
            
            if data.get('accepted'):
                room.game_state = 'finished'
        else:
            logger.error("Opponent not found for draw response")
            
    except Exception as e:
        logger.error(f"Error in handle_draw_response: {str(e)}")

@socketio.on('resign_game')
def handle_resignation():
    try:
        player_id = request.sid
        player = players.get(player_id)
        
        if not player:
            logger.error("Player not found for resignation")
            return
            
        room = rooms.get(player.room_id)
        if not room:
            logger.error("Room not found for resignation")
            return
            
        # Get opponent's socket ID directly from room
        opponent_sid = room.black_player if player_id == room.white_player else room.white_player
        
        if opponent_sid:
            # Emit resignation to opponent
            emit('opponent_resigned', room=opponent_sid)
            logger.info(f"Resignation sent from {player_id} to {opponent_sid}")
            room.game_state = 'finished'
        else:
            logger.error("Opponent not found for resignation")
            
    except Exception as e:
        logger.error(f"Error in handle_resignation: {str(e)}")

if __name__ == '__main__':
    logger.info("Starting Flask application")
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, 
                host='0.0.0.0',
                port=port)