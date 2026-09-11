import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class OutboxMutation {
  final String id;
  final String mutationType; // 'CREATE_SALE', 'RECORD_UDHAAR', 'STOCK_UPDATE', 'ADD_PRODUCT'
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  bool isSynced;

  OutboxMutation({
    required this.id,
    required this.mutationType,
    required this.payload,
    required this.createdAt,
    this.isSynced = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'mutation_type': mutationType,
        'payload': payload,
        'created_at': createdAt.toIso8601String(),
        'is_synced': isSynced,
      };

  factory OutboxMutation.fromJson(Map<String, dynamic> json) => OutboxMutation(
        id: json['id'] ?? const Uuid().v4(),
        mutationType: json['mutation_type'] ?? 'CREATE_SALE',
        payload: json['payload'] is Map<String, dynamic>
            ? json['payload']
            : jsonDecode(json['payload'] ?? '{}'),
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'])
            : DateTime.now(),
        isSynced: json['is_synced'] ?? false,
      );
}

class OutboxQueueService {
  static const String _outboxKey = 'vendorsathi_offline_outbox_queue';
  static final _uuid = const Uuid();

  static Future<List<OutboxMutation>> getQueuedMutations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final rawList = prefs.getStringList(_outboxKey) ?? [];
      return rawList
          .map((item) => OutboxMutation.fromJson(jsonDecode(item)))
          .where((m) => !m.isSynced)
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<int> getPendingCount() async {
    final list = await getQueuedMutations();
    return list.length;
  }

  static Future<OutboxMutation> enqueue({
    required String mutationType,
    required Map<String, dynamic> payload,
  }) async {
    final mutation = OutboxMutation(
      id: _uuid.v4(),
      mutationType: mutationType,
      payload: payload,
      createdAt: DateTime.now(),
      isSynced: false,
    );

    try {
      final prefs = await SharedPreferences.getInstance();
      final current = prefs.getStringList(_outboxKey) ?? [];
      current.add(jsonEncode(mutation.toJson()));
      await prefs.setStringList(_outboxKey, current);
    } catch (_) {}

    return mutation;
  }

  static Future<void> markAllSynced(List<String> mutationIds) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final current = prefs.getStringList(_outboxKey) ?? [];
      final updated = current.map((item) {
        final decoded = jsonDecode(item);
        if (mutationIds.contains(decoded['id'])) {
          decoded['is_synced'] = true;
        }
        return jsonEncode(decoded);
      }).toList();
      // Remove synced items to keep storage compact
      final remaining = updated.where((item) {
        final d = jsonDecode(item);
        return d['is_synced'] != true;
      }).toList();
      await prefs.setStringList(_outboxKey, remaining);
    } catch (_) {}
  }

  static Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_outboxKey);
  }
}
