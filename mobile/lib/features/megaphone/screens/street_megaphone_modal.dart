import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/megaphone_provider.dart';

class StreetMegaphoneModal extends ConsumerStatefulWidget {
  const StreetMegaphoneModal({Key? key}) : super(key: key);

  @override
  ConsumerState<StreetMegaphoneModal> createState() => _StreetMegaphoneModalState();
}

class _StreetMegaphoneModalState extends ConsumerState<StreetMegaphoneModal> {
  final _customController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final megaState = ref.watch(megaphoneProvider);
    final megaNotifier = ref.read(megaphoneProvider.notifier);

    final presetPhrases = [
      tr.tr('phrase_veg_fresh'),
      tr.tr('phrase_fruits'),
      tr.tr('phrase_chaat'),
    ];

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrangeLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.campaign, color: AppColors.primaryOrange, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr.tr('megaphone_title'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textMain),
                      ),
                      Text(
                        tr.tr('megaphone_subtitle'),
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Active Broadcast Status
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: megaState.isBroadcasting
                  ? AppColors.primaryOrangeLight.withOpacity(0.5)
                  : AppColors.bgCanvas,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: megaState.isBroadcasting ? AppColors.primaryOrange : Colors.grey.shade300,
                width: megaState.isBroadcasting ? 2 : 1,
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      megaState.isBroadcasting ? Icons.graphic_eq : Icons.volume_mute,
                      color: megaState.isBroadcasting ? AppColors.primaryOrange : AppColors.textMuted,
                      size: 24,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      megaState.isBroadcasting ? tr.tr('broadcast_looping') : tr.tr('megaphone_subtitle'),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: megaState.isBroadcasting ? AppColors.primaryOrange : AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  megaState.activePhrase,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textMain),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Start / Stop Main Megaphone Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: megaState.isBroadcasting ? AppColors.alertRed : AppColors.primaryOrange,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(18)),
              elevation: 4,
            ),
            icon: Icon(megaState.isBroadcasting ? Icons.stop : Icons.play_arrow, size: 28),
            label: Text(
              megaState.isBroadcasting ? tr.tr('stop_broadcast') : tr.tr('start_broadcast'),
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            onPressed: () {
              if (megaState.isBroadcasting) {
                megaNotifier.stopBroadcast();
              } else {
                megaNotifier.startBroadcast(megaState.activePhrase, lang);
              }
            },
          ),
          const SizedBox(height: 20),

          // Preset Street Announcement Options
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "Preset Announcements:",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
            ),
          ),
          const SizedBox(height: 8),

          ...presetPhrases.map((phrase) {
            final isSelected = megaState.activePhrase == phrase;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                shape: RoundedRectangleRBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(
                    color: isSelected ? AppColors.primaryOrange : Colors.grey.shade200,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                tileColor: isSelected ? AppColors.primaryOrangeLight.withOpacity(0.3) : Colors.white,
                leading: Icon(
                  Icons.campaign,
                  color: isSelected ? AppColors.primaryOrange : Colors.grey,
                ),
                title: Text(
                  phrase,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: AppColors.textMain,
                  ),
                ),
                onTap: () {
                  megaNotifier.setPhrase(phrase);
                  if (megaState.isBroadcasting) {
                    megaNotifier.startBroadcast(phrase, lang);
                  }
                },
              ),
            );
          }).toList(),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
