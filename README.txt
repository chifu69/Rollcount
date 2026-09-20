ROLL COUNT PWA v7.1

- Preserves all Roll Count v7 inventory, scrap, history, sorting, laminated roll types, Roll Consumption, sharing, printing and New Day behavior.
- Roll Consumption now identifies the source extruder from the roll-number prefix:
  16 = Extruder 1, 26 = Extruder 2, 36 = Extruder 3, 46 = Extruder 4.
- Extruder labels use subtle color badges for quick identification.
- Roll Consumption is automatically ordered by Extruder 1, 2, 3, 4 while preserving the original order inside each extruder. Extruders with no rolls are simply skipped.
- Copy Report uses a rich-HTML clipboard path with a compatibility fallback so Outlook can keep the formatted report when supported.
- Share Report now opens an in-app choice with Outlook / Email first, then Windows Share.
- Outlook / Email copies the formatted report first and opens the default email app; paste with Ctrl+V to keep the formatted layout.
- Windows Share remains available as the standard system share route and uses plain text because the Web Share API does not support an HTML email body.
