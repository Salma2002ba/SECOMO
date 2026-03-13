export type Lang = 'FR' | 'EN';

const translations = {
  // Navigation
  nav_dashboard: { FR: 'Dashboard', EN: 'Dashboard' },
  nav_plants: { FR: 'Mes Plantes', EN: 'My Plants' },
  nav_alerts: { FR: 'Alertes', EN: 'Alerts' },
  nav_activities: { FR: 'Activités', EN: 'Activities' },
  nav_config: { FR: 'Configuration', EN: 'Configuration' },
  nav_profile: { FR: 'Mon Profil', EN: 'My Profile' },

  // Header
  header_station: { FR: 'Station', EN: 'Station' },
  header_bac: { FR: 'Bac', EN: 'Tank' },

  // Auth
  auth_login_title: { FR: 'Ravi de vous revoir', EN: 'Welcome back' },
  auth_login_subtitle: { FR: 'Accédez à votre dashboard', EN: 'Access your dashboard' },
  auth_register_title: { FR: 'Rejoindre SECOMO', EN: 'Join SECOMO' },
  auth_register_subtitle: { FR: 'Créez votre compte et pilotez vos bacs', EN: 'Create your account and control your tanks' },
  auth_email: { FR: 'Adresse email', EN: 'Email address' },
  auth_password: { FR: 'Mot de passe', EN: 'Password' },
  auth_firstname: { FR: 'Prénom', EN: 'First name' },
  auth_lastname: { FR: 'Nom', EN: 'Last name' },
  auth_login_btn: { FR: 'Se connecter', EN: 'Sign in' },
  auth_register_btn: { FR: 'Créer un compte', EN: 'Create account' },
  auth_no_account: { FR: 'Pas encore de compte ?', EN: 'No account yet?' },
  auth_already_account: { FR: 'Déjà inscrit ?', EN: 'Already registered?' },
  auth_click_here: { FR: 'Cliquez ici', EN: 'Click here' },
  auth_cgu: { FR: "J'accepte les", EN: 'I accept the' },
  auth_cgu_link: { FR: "conditions générales d'utilisation", EN: 'terms of service' },
  auth_cgu_suffix: { FR: 'du POC SECOMO', EN: 'of SECOMO POC' },
  auth_connecting: { FR: 'Connexion...', EN: 'Signing in...' },

  // CGU modal
  cgu_title: { FR: "Conditions générales d'utilisation", EN: 'Terms of Service' },
  cgu_understood: { FR: "J'ai compris", EN: 'Got it' },

  // Logout
  logout: { FR: 'Déconnexion', EN: 'Sign out' },

  // Dashboard
  dash_no_sensor: { FR: 'En attente des capteurs', EN: 'Waiting for sensors' },
  dash_no_sensor_sub: { FR: "Aucune donnée reçue pour ce bac. Connectez l'ESP32 ou attendez la prochaine mesure.", EN: 'No data received for this tank. Connect the ESP32 or wait for the next measurement.' },
  dash_temp: { FR: 'Temp Air', EN: 'Air Temp' },
  dash_humidity: { FR: 'Humidité', EN: 'Humidity' },
  dash_light: { FR: 'Lumière', EN: 'Light' },
  dash_ph: { FR: 'pH Sol', EN: 'Soil pH' },
  dash_battery: { FR: 'Batterie', EN: 'Battery' },
  dash_target: { FR: 'Cible', EN: 'Target' },
  dash_status_ok: { FR: 'OK', EN: 'OK' },
  dash_status_low: { FR: 'Bas', EN: 'Low' },
  dash_status_high: { FR: 'Élevé', EN: 'High' },
  dash_status_conforme: { FR: 'Conforme', EN: 'Optimal' },
  dash_status_trop_bas: { FR: 'Trop Bas', EN: 'Too Low' },
  dash_status_trop_haut: { FR: 'Trop Haut', EN: 'Too High' },
  dash_status_inactif: { FR: 'Inactif', EN: 'Inactive' },
  dash_manual_mode: { FR: 'Manuel', EN: 'Manual' },
  dash_auto_mode: { FR: 'Auto', EN: 'Auto' },
  dash_auto_info: { FR: "Paramétrez l'automatisation bac par bac dans", EN: 'Set up automation tank by tank in' },

  // Watering
  water_manual: { FR: 'Arrosage Manuel', EN: 'Manual Watering' },
  water_duration: { FR: 'Durée', EN: 'Duration' },
  water_seconds: { FR: 'secondes', EN: 'seconds' },
  water_start: { FR: 'Démarrer arrosage', EN: 'Start watering' },
  water_stop: { FR: 'Arrêter arrosage', EN: 'Stop watering' },
  water_in_progress: { FR: 'En cours', EN: 'In progress' },
  water_last: { FR: 'Dernier arrosage', EN: 'Last watering' },
  water_never: { FR: 'Jamais', EN: 'Never' },

  // Controls
  ctrl_light: { FR: 'Lumière', EN: 'Lighting' },
  ctrl_fan: { FR: 'Ventilation', EN: 'Ventilation' },
  ctrl_on: { FR: 'ON', EN: 'ON' },
  ctrl_off: { FR: 'OFF', EN: 'OFF' },
  ctrl_active: { FR: 'Active', EN: 'Active' },
  ctrl_inactive: { FR: 'Inactive', EN: 'Inactive' },

  // Recommendations
  rec_title: { FR: 'Recommandations', EN: 'Recommendations' },
  rec_no_plant: { FR: 'Aucune plante assignée', EN: 'No plant assigned' },
  rec_no_plant_sub: { FR: "Associez une plante à ce bac pour voir les recommandations.", EN: 'Assign a plant to this tank to see recommendations.' },
  rec_assign_plant: { FR: 'Assigner une plante', EN: 'Assign a plant' },
  rec_auto_handled: { FR: "Mode AUTO actif — l'automatisation gère les actions.", EN: 'AUTO mode active — automation handles actions.' },
  rec_all_good: { FR: 'Tout est optimal !', EN: 'Everything is optimal!' },

  // Plants view
  plant_title: { FR: 'Mes Plantes', EN: 'My Plants' },
  plant_new: { FR: 'Nouvelle plante', EN: 'New plant' },
  plant_search: { FR: 'Rechercher une plante...', EN: 'Search a plant...' },
  plant_no_result: { FR: 'Aucune plante trouvée', EN: 'No plant found' },
  plant_linked: { FR: 'liée(s)', EN: 'linked' },
  plant_unlinked: { FR: 'non liée(s)', EN: 'unlinked' },
  plant_apply: { FR: 'Appliquer au bac sélectionné', EN: 'Apply to selected tank' },
  plant_link_to_bac: { FR: 'Lié à un bac', EN: 'Link to a tank' },
  plant_edit: { FR: 'Modifier', EN: 'Edit' },
  plant_delete_confirm: { FR: 'Supprimer cette plante ?', EN: 'Delete this plant?' },
  plant_delete_confirm_sub: { FR: 'Les bacs liés perdront leur profil.', EN: 'Linked tanks will lose their profile.' },
  plant_delete_btn: { FR: 'Supprimer', EN: 'Delete' },
  plant_cancel: { FR: 'Annuler', EN: 'Cancel' },
  plant_humidity: { FR: 'Humidité sol', EN: 'Soil humidity' },
  plant_temp: { FR: 'Température', EN: 'Temperature' },
  plant_light_min: { FR: 'Lumière min', EN: 'Min light' },
  plant_ph: { FR: 'pH sol', EN: 'Soil pH' },
  plant_notes: { FR: 'Notes', EN: 'Notes' },
  plant_notes_placeholder: { FR: 'Infos, conseils de culture...', EN: 'Info, growing tips...' },
  plant_name: { FR: 'Nom de la plante', EN: 'Plant name' },
  plant_save: { FR: 'Enregistrer', EN: 'Save' },
  plant_profile_total: { FR: 'profil au total', EN: 'profile total' },
  plant_profiles_total: { FR: 'profils au total', EN: 'profiles total' },
  plant_unlinked_single: { FR: 'non lié', EN: 'unlinked' },
  plant_unlinked_plural: { FR: 'non liés', EN: 'unlinked' },
  plant_no_plants: { FR: 'Aucune plante', EN: 'No plants' },
  plant_no_plants_sub: { FR: 'Créez votre premier profil de plante.', EN: 'Create your first plant profile.' },
  plant_no_notes: { FR: 'Aucune note', EN: 'No notes' },
  plant_no_assigned: { FR: 'Aucune plante assignée à ce bac.', EN: 'No plant assigned to this tank.' },
  plant_select_none: { FR: '— Aucune plante —', EN: '— No plant —' },

  // Alerts view
  alert_title: { FR: 'Alertes', EN: 'Alerts' },
  alert_mark_all: { FR: 'Tout marquer lu', EN: 'Mark all as read' },
  alert_no_alerts: { FR: 'Aucune alerte', EN: 'No alerts' },
  alert_no_alerts_sub: { FR: 'Tout est dans les normes.', EN: 'Everything is within normal range.' },
  alert_unknown_station: { FR: 'Station inconnue', EN: 'Unknown station' },
  alert_new: { FR: 'NOUVEAU', EN: 'NEW' },
  alert_info: { FR: 'INFO', EN: 'INFO' },
  alert_warning: { FR: 'AVERTISSEMENT', EN: 'WARNING' },
  alert_critical: { FR: 'CRITIQUE', EN: 'CRITICAL' },

  // Activities view
  alert_count: { FR: 'alerte', EN: 'alert' },
  alert_count_plural: { FR: 'alertes', EN: 'alerts' },
  act_title: { FR: 'Historique des arrosages sur toutes vos stations.', EN: 'Watering history across all your stations.' },
  act_events: { FR: 'événement', EN: 'event' },
  act_events_plural: { FR: 'événements', EN: 'events' },
  act_no_activity: { FR: 'Aucune activité', EN: 'No activity' },
  act_no_activity_sub: { FR: 'Les arrosages et événements apparaîtront ici.', EN: 'Waterings and events will appear here.' },
  act_auto: { FR: 'Automatique', EN: 'Automatic' },
  act_manual: { FR: 'Manuel', EN: 'Manual' },
  act_duration: { FR: 'durée', EN: 'duration' },
  act_sec: { FR: 's', EN: 's' },

  // Config view
  cfg_title: { FR: 'Mes Stations', EN: 'My Stations' },
  cfg_subtitle: { FR: 'Gérez vos stations et positionnez vos bacs sur la grille.', EN: 'Manage your stations and position your tanks on the grid.' },
  cfg_new_station: { FR: 'Nouvelle Station', EN: 'New Station' },
  cfg_no_stations: { FR: 'Aucune station configurée', EN: 'No station configured' },
  cfg_no_stations_sub: { FR: 'Créez votre première station pour commencer.', EN: 'Create your first station to get started.' },
  cfg_station_name: { FR: 'Nom de la station', EN: 'Station name' },
  cfg_station_location: { FR: 'Emplacement', EN: 'Location' },
  cfg_station_location_ph: { FR: 'Ex: Serre principale, Balcon...', EN: 'Ex: Main greenhouse, Balcony...' },
  cfg_station_name_ph: { FR: 'Ex: Serre Nord', EN: 'Ex: North Greenhouse' },
  cfg_save: { FR: 'Enregistrer', EN: 'Save' },
  cfg_cancel: { FR: 'Annuler', EN: 'Cancel' },
  cfg_unknown_location: { FR: 'Emplacement non défini', EN: 'Location not defined' },
  cfg_bac: { FR: 'bac', EN: 'tank' },
  cfg_bacs: { FR: 'bacs', EN: 'tanks' },
  cfg_add_bac: { FR: '+ Ajouter un bac', EN: '+ Add a tank' },
  cfg_bac_name: { FR: 'Nom du bac', EN: 'Tank name' },
  cfg_bac_name_ph: { FR: 'Ex: Bac Tomates', EN: 'Ex: Tomato Tank' },
  cfg_size: { FR: 'Taille', EN: 'Size' },
  cfg_level: { FR: 'Niveau', EN: 'Level' },
  cfg_location: { FR: 'Emplacement', EN: 'Location' },
  cfg_auto: { FR: 'Automatisation', EN: 'Automation' },
  cfg_save_bac: { FR: 'Enregistrer le bac', EN: 'Save tank' },
  cfg_no_bac: { FR: 'Aucun bac', EN: 'No tank' },
  cfg_no_bac_sub: { FR: 'Cliquez sur une case pour ajouter un bac.', EN: 'Click on a slot to add a tank.' },
  cfg_assigned_plant: { FR: 'Plante assignée', EN: 'Assigned plant' },
  cfg_no_plant: { FR: 'Aucune plante', EN: 'No plant' },

  // Profile view
  prof_title: { FR: 'Mon Profil', EN: 'My Profile' },
  prof_personal_info: { FR: 'Informations Personnelles', EN: 'Personal Information' },
  prof_personal_info_sub: { FR: 'Gérez votre identité et vos coordonnées.', EN: 'Manage your identity and contact details.' },
  prof_identity: { FR: 'Identité', EN: 'Identity' },
  prof_firstname: { FR: 'Prénom', EN: 'First name' },
  prof_lastname: { FR: 'Nom', EN: 'Last name' },
  prof_email: { FR: 'Email', EN: 'Email' },
  prof_role: { FR: 'Rôle', EN: 'Role' },
  prof_member_since: { FR: 'Membre depuis', EN: 'Member since' },
  prof_preferences: { FR: 'Préférences', EN: 'Preferences' },
  prof_general_settings: { FR: 'Paramètres Généraux', EN: 'General Settings' },
  prof_theme: { FR: 'Thème', EN: 'Theme' },
  prof_theme_light: { FR: 'Clair', EN: 'Light' },
  prof_theme_dark: { FR: 'Sombre', EN: 'Dark' },
  prof_appearance: { FR: 'Apparence', EN: 'Appearance' },
  prof_theme_light_label: { FR: 'Tech Calme (Clair)', EN: 'Tech Calm (Light)' },
  prof_theme_dark_label: { FR: 'Dark Soft (Sombre)', EN: 'Dark Soft (Dark)' },
  prof_language: { FR: 'Langue', EN: 'Language' },
  prof_unit: { FR: 'Unité de température', EN: 'Temperature unit' },
  prof_timezone: { FR: 'Fuseau horaire', EN: 'Timezone' },
  prof_save_prefs: { FR: 'Enregistrer les préférences', EN: 'Save preferences' },
  prof_security: { FR: 'Sécurité', EN: 'Security' },
  prof_security_title: { FR: 'Sécurité du compte', EN: 'Account Security' },
  prof_current_pwd: { FR: 'Mot de passe actuel', EN: 'Current password' },
  prof_new_pwd: { FR: 'Nouveau mot de passe', EN: 'New password' },
  prof_confirm_pwd: { FR: 'Confirmer le mot de passe', EN: 'Confirm password' },
  prof_change_pwd: { FR: 'Changer le mot de passe', EN: 'Change password' },
  prof_saved: { FR: 'Préférences sauvegardées', EN: 'Preferences saved' },
  prof_pwd_changed: { FR: 'Mot de passe modifié', EN: 'Password changed' },
  prof_pwd_mismatch: { FR: 'Les mots de passe ne correspondent pas', EN: 'Passwords do not match' },
  prof_sys_info: { FR: 'Informations système', EN: 'System information' },
  prof_account_created: { FR: 'Compte créé le', EN: 'Account created on' },
  prof_user_id: { FR: 'ID Utilisateur', EN: 'User ID' },
  prof_danger: { FR: 'Zone dangereuse', EN: 'Danger zone' },
  prof_delete_account: { FR: 'Supprimer mon compte', EN: 'Delete my account' },

  // Fan / light controls
  ctrl_fan_on: { FR: 'Ventilateur ON', EN: 'Fan ON' },
  ctrl_fan_off: { FR: 'Ventilateur OFF', EN: 'Fan OFF' },
  ctrl_led: { FR: 'Éclairage LED', EN: 'LED Lighting' },
  ctrl_light_on: { FR: 'Allumée', EN: 'On' },
  ctrl_light_off: { FR: 'Éteinte', EN: 'Off' },
  ctrl_light_turn_off: { FR: 'Éteindre', EN: 'Turn off' },
  ctrl_light_turn_on: { FR: 'Allumer', EN: 'Turn on' },

  // Config modal
  cfg_grid_size: { FR: 'Taille de la grille', EN: 'Grid size' },
  cfg_grid_rows: { FR: 'Lignes', EN: 'Rows' },
  cfg_grid_cols: { FR: 'Colonnes', EN: 'Columns' },
  cfg_grid_bacs_warning: { FR: 'Des bacs sont hors grille — agrandissez la grille pour les voir.', EN: 'Some tanks are outside the grid — increase the grid size to see them.' },
  cfg_edit_station: { FR: 'Modifier la station', EN: 'Edit station' },
  cfg_new_station_title: { FR: 'Nouvelle station', EN: 'New station' },
  cfg_station_no_name: { FR: 'Station sans nom', EN: 'Unnamed station' },
  cfg_bac_unknown: { FR: 'Bac inconnu', EN: 'Unknown tank' },
  cfg_label_name: { FR: 'Nom', EN: 'Name' },
  cfg_label_size: { FR: 'Taille', EN: 'Size' },
  cfg_label_measures: { FR: 'Mesures', EN: 'Sampling' },
  cfg_label_automation: { FR: 'Automatisation', EN: 'Automation' },
  cfg_size_small: { FR: 'Petit (~5L)', EN: 'Small (~5L)' },
  cfg_size_medium: { FR: 'Moyen (~15L)', EN: 'Medium (~15L)' },
  cfg_size_large: { FR: 'Grand (~40L)', EN: 'Large (~40L)' },
  cfg_auto_watering: { FR: 'Arrosage automatique', EN: 'Automatic watering' },
  cfg_auto_watering_desc: { FR: 'Arrose quand le sol est trop sec', EN: 'Waters when soil is too dry' },
  cfg_auto_ventilation: { FR: 'Ventilation automatique', EN: 'Automatic ventilation' },
  cfg_auto_ventilation_desc: { FR: 'Active le ventilateur si temp. hors plage', EN: 'Activates fan if temp. out of range' },
  cfg_auto_lighting: { FR: 'Éclairage automatique', EN: 'Automatic lighting' },
  cfg_auto_lighting_desc: { FR: 'Active les LEDs si lumière insuffisante', EN: 'Activates LEDs if light is insufficient' },

  // Plant profile modal
  plant_edit_profile: { FR: 'Modifier le profil', EN: 'Edit profile' },
  plant_new_profile: { FR: 'Nouveau profil de plante', EN: 'New plant profile' },
  plant_catalog_search: { FR: 'Rechercher une plante dans le catalogue (5500+ espèces)', EN: 'Search a plant in the catalog (5500+ species)' },

  // Profile save messages
  prof_saved_ok: { FR: 'Profil mis à jour avec succès.', EN: 'Profile updated successfully.' },
  prof_pwd_ok: { FR: 'Mot de passe modifié.', EN: 'Password changed.' },
  prof_pwd_ok_sim: { FR: 'Mot de passe modifié (simulation).', EN: 'Password changed (simulation).' },
  prof_pwd_error: { FR: 'Erreur lors du changement.', EN: 'Error while changing password.' },

  // Simulation watering reasons
  sim_reason_auto: { FR: 'Humidité sol basse (auto)', EN: 'Low soil humidity (auto)' },
  sim_reason_manual: { FR: 'Arrosage manuel', EN: 'Manual watering' },

  // History chart
  chart_title: { FR: 'Historique (Dernière Heure)', EN: 'History (Last Hour)' },
  chart_humidity: { FR: 'Humidité', EN: 'Humidity' },
  chart_ph: { FR: 'pH Sol', EN: 'Soil pH' },
  chart_temp_air: { FR: 'Temp. Air', EN: 'Air Temp.' },

  // Sensor card
  sensor_target_label: { FR: 'Cible', EN: 'Target' },

  // Weather widget
  weather_your_location: { FR: 'Votre position', EN: 'Your location' },
  weather_rain: { FR: 'pluie', EN: 'rain' },
  weather_reduced_watering: { FR: 'Arrosage réduit conseillé', EN: 'Reduced watering advised' },

  // Config swap
  cfg_bac_selected: { FR: 'Bac sélectionné', EN: 'Selected tank' },

  // Alerts summary
  alert_unread_singular: { FR: 'non lue', EN: 'unread' },
  alert_unread_plural:   { FR: 'non lues', EN: 'unread' },
  alert_all_read:        { FR: 'toutes lues', EN: 'all read' },

  // Simulation / backend status
  sim_mode: { FR: '⚡ Mode simulation', EN: '⚡ Simulation mode' },
  sim_offline: { FR: 'Backend hors ligne', EN: 'Backend offline' },

  // Dashboard extras
  dash_slider_drag: { FR: 'Glisser pour ajuster', EN: 'Drag to adjust' },
  dash_manual_controls: { FR: 'Contrôles Manuels', EN: 'Manual Controls' },
  dash_cultivated_plant: { FR: 'Plante Cultivée', EN: 'Cultivated Plant' },

  // Profile extras
  prof_email_readonly: { FR: 'Adresse Email (Lecture seule)', EN: 'Email Address (Read only)' },

  // Config extras
  cfg_plants_no_bac: { FR: 'Plantes sans bac assigné', EN: 'Plants without assigned tank' },
  cfg_grid_help: { FR: 'Survolez un bac pour accéder à son icône Paramètres — automatisation (arrosage, ventilation, éclairage), taille du bac, fréquence de mesure.', EN: 'Hover over a tank to access its Settings icon — automation (watering, ventilation, lighting), tank size, sampling frequency.' },
  cfg_new_bac_title: { FR: 'Nouveau bac', EN: 'New tank' },
  cfg_physical_linked: { FR: 'Bac physique lié', EN: 'Linked physical tank' },
  qr_link_label: { FR: 'Lier au bac physique (ESP32)', EN: 'Link to physical tank (ESP32)' },
  qr_scan_btn: { FR: 'Scanner QR Code', EN: 'Scan QR Code' },
  qr_manual_btn: { FR: 'Saisie manuelle', EN: 'Manual entry' },
  qr_optional: { FR: 'Optionnel — vous pouvez lier le bac plus tard.', EN: 'Optional — you can link the tank later.' },
  qr_scan_title: { FR: "Scanner le QR Code de l'ESP32", EN: 'Scan the ESP32 QR Code' },
  qr_manual_title: { FR: "Code physique de l'ESP32", EN: 'ESP32 physical code' },
  qr_switch_manual: { FR: 'Passer à la saisie manuelle →', EN: 'Switch to manual entry →' },
  qr_api_hint: { FR: "Trouvez la clé API dans la config de votre ESP32 ou sur l'étiquette du bac.", EN: 'Find the API key in your ESP32 config or on the tank label.' },
  qr_no_support: { FR: 'Votre navigateur ne supporte pas le scan QR. Utilisez la saisie manuelle.', EN: 'Your browser does not support QR scanning. Use manual entry.' },
  qr_camera_denied: { FR: 'Accès à la caméra refusé. Utilisez la saisie manuelle.', EN: 'Camera access denied. Use manual entry.' },
  cfg_create_bac: { FR: 'Créer le bac', EN: 'Create tank' },
  cfg_bac_swap_hint: { FR: 'Cliquez sur un autre bac pour interchanger leurs plantes', EN: 'Click another tank to swap their plants' },

  // Alerts extras
  alert_clear_all: { FR: 'Tout effacer', EN: 'Clear all' },
  alert_see_dashboard: { FR: 'Voir le dashboard', EN: 'View dashboard' },

  // Plant form
  plant_form_humidity: { FR: 'Humidité du sol (%)', EN: 'Soil humidity (%)' },
  plant_form_humidity_tip: { FR: "Le taux d'eau dans la terre. 0% = terre complètement sèche, 100% = saturée d'eau. La plupart des plantes poussent bien entre 40% et 70%.", EN: 'Water content in the soil. 0% = completely dry, 100% = saturated. Most plants grow well between 40% and 70%.' },
  plant_form_temp: { FR: 'Température (°C)', EN: 'Temperature (°C)' },
  plant_form_temp_tip: { FR: "Plage de température tolérée. En dessous du min ou au-dessus du max, la croissance ralentit ou la plante souffre. Intérieur classique : 18-25°C.", EN: 'Tolerated temperature range. Below min or above max, growth slows or the plant suffers. Typical indoor range: 18-25°C.' },
  plant_form_light: { FR: 'Lumière minimum (%)', EN: 'Minimum light (%)' },
  plant_form_light_tip: { FR: "Intensité lumineuse minimale. 30-40% = mi-ombre (salades, menthe), 60-80% = plein soleil (tomates, piments). En dessous, les LEDs horticoles s'activeront automatiquement.", EN: 'Minimum light intensity. 30-40% = partial shade (lettuce, mint), 60-80% = full sun (tomatoes, peppers). Below this, horticultural LEDs will activate automatically.' },
  plant_form_ph: { FR: 'pH du sol', EN: 'Soil pH' },
  plant_form_ph_tip: { FR: "Acidité du sol, de 0 (très acide) à 14 (très basique). Potager classique : 6.0-7.0 (légèrement acide à neutre). Fraises et myrtilles préfèrent un sol plus acide (5.0-6.0).", EN: 'Soil acidity, from 0 (very acidic) to 14 (very alkaline). Typical garden: 6.0-7.0 (slightly acidic to neutral). Strawberries and blueberries prefer more acidic soil (5.0-6.0).' },
  plant_not_assigned: { FR: 'Non assignée à un bac', EN: 'Not assigned to a tank' },
  plant_delete_desc: { FR: 'sera supprimée et désassociée de tous les bacs.', EN: 'will be deleted and unlinked from all tanks.' },
  plant_catalog_no_result: { FR: 'Aucun résultat. Vous pouvez remplir les champs manuellement ci-dessous.', EN: 'No results. You can fill in the fields manually below.' },
  plant_catalog_hint: { FR: 'Tapez au moins 2 caractères pour rechercher. Les valeurs seront pré-remplies automatiquement.', EN: 'Type at least 2 characters to search. Values will be pre-filled automatically.' },

  // General
  gen_min: { FR: 'Min', EN: 'Min' },
  gen_max: { FR: 'Max', EN: 'Max' },
  gen_minimum: { FR: 'Minimum', EN: 'Minimum' },
  gen_maximum: { FR: 'Maximum', EN: 'Maximum' },
  gen_save: { FR: 'Enregistrer', EN: 'Save' },
  gen_cancel: { FR: 'Annuler', EN: 'Cancel' },
  gen_delete: { FR: 'Supprimer', EN: 'Delete' },
  gen_edit: { FR: 'Modifier', EN: 'Edit' },
  gen_close: { FR: 'Fermer', EN: 'Close' },
  gen_back: { FR: 'Retour', EN: 'Back' },
  gen_refresh: { FR: 'Actualiser les données capteurs', EN: 'Refresh sensor data' },
  dash_auto_active: { FR: 'Mode AUTO actif — cliquer pour passer en manuel', EN: 'AUTO mode active — click to switch to manual' },
  cfg_bac_settings: { FR: 'Paramètres du bac', EN: 'Tank settings' },
  alert_delete: { FR: 'Supprimer cette alerte', EN: 'Delete this alert' },

  // Water tank card
  tank_label:       { FR: 'Réservoir', EN: 'Water Tank' },
  tank_refill_hint: { FR: 'Remplir le réservoir si niveau < 30%', EN: 'Refill tank when level < 30%' },

  // Manual controls labels (previously hardcoded)
  ctrl_watering_label:    { FR: 'Arroser', EN: 'Water' },
  ctrl_ventilation_label: { FR: 'Ventilation', EN: 'Ventilation' },
  ctrl_target_temp:       { FR: '°C cible', EN: '°C target' },

  // Auto mode info
  dash_auto_fan_speed: { FR: 'Vitesse ventil.', EN: 'Fan speed' },
  prof_save_info: { FR: 'Enregistrer les modifications', EN: 'Save changes' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang] ?? translations[key]['FR'];
}

// ---------------------------------------------------------------------------
// Noms des plantes par défaut (stockées en FR en DB)
// ---------------------------------------------------------------------------
const DEFAULT_PLANT_NAMES: Record<string, { EN: string }> = {
  'Basilic Grand Vert':  { EN: 'Large Green Basil' },
  'Tomates Cerises':     { EN: 'Cherry Tomatoes' },
  'Menthe Poivrée':      { EN: 'Peppermint' },
};

export function translatePlantName(name: string, lang: Lang): string {
  if (lang === 'FR') return name;
  return DEFAULT_PLANT_NAMES[name]?.EN ?? name;
}

// ---------------------------------------------------------------------------
// Messages dynamiques d'alertes
// ---------------------------------------------------------------------------
export function alertMsg(
  category: 'humidity_low' | 'humidity_high' | 'temp_low' | 'temp_high' | 'ph_low' | 'ph_high' | 'light_low' | 'battery_low' | 'water_tank_low',
  values: { val: number; threshold: number; plantName: string },
  lang: Lang,
): string {
  const name = translatePlantName(values.plantName, lang);
  const v = values.val;
  const thr = values.threshold;
  if (lang === 'EN') {
    switch (category) {
      case 'humidity_low':   return `Low humidity: ${v.toFixed(0)}% (min ${thr}% for ${name})`;
      case 'humidity_high':  return `High humidity: ${v.toFixed(0)}% (max ${thr}% for ${name})`;
      case 'temp_low':       return `Low temperature: ${v.toFixed(1)}°C (min ${thr}°C for ${name})`;
      case 'temp_high':      return `High temperature: ${v.toFixed(1)}°C (max ${thr}°C for ${name})`;
      case 'ph_low':         return `Low soil pH: ${v.toFixed(1)} (min ${thr} for ${name})`;
      case 'ph_high':        return `High soil pH: ${v.toFixed(1)} (max ${thr} for ${name})`;
      case 'light_low':      return `Insufficient light: ${v.toFixed(0)}% (min ${thr}% for ${name}). Consider activating the LEDs.`;
      case 'battery_low':    return `Low battery: ${v.toFixed(0)}% — replace soon.`;
      case 'water_tank_low': return `Water tank low: ${v.toFixed(0)}% remaining — refill the tank.`;
    }
  }
  switch (category) {
    case 'humidity_low':   return `Humidité basse : ${v.toFixed(0)}% (min ${thr}% pour ${name})`;
    case 'humidity_high':  return `Humidité élevée : ${v.toFixed(0)}% (max ${thr}% pour ${name})`;
    case 'temp_low':       return `Température basse : ${v.toFixed(1)}°C (min ${thr}°C pour ${name})`;
    case 'temp_high':      return `Température élevée : ${v.toFixed(1)}°C (max ${thr}°C pour ${name})`;
    case 'ph_low':         return `pH sol bas : ${v.toFixed(1)} (min ${thr} pour ${name})`;
    case 'ph_high':        return `pH sol élevé : ${v.toFixed(1)} (max ${thr} pour ${name})`;
    case 'light_low':      return `Lumière insuffisante : ${v.toFixed(0)}% (min ${thr}% pour ${name}). Pensez à activer les LEDs.`;
    case 'battery_low':    return `Batterie faible : ${v.toFixed(0)}% — remplacez-la rapidement.`;
    case 'water_tank_low': return `Réservoir bas : ${v.toFixed(0)}% restant — remplissez le réservoir.`;
  }
}

// ---------------------------------------------------------------------------
// Messages dynamiques de recommandations
// ---------------------------------------------------------------------------
export function recMsg(
  id: 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'r7' | 'r8' | 'r9' | 'r10' | 'r11' | 'r12' | 'r13' | 'r14' | 'r15',
  val: number,
  lang: Lang,
): string {
  if (lang === 'EN') {
    switch (id) {
      case 'r1':  return `Critical humidity (${val.toFixed(0)}%): use the Water button.`;
      case 'r2':  return `Soil too wet (${val.toFixed(0)}%): pause watering.`;
      case 'r3':  return `Temperature too high (${val.toFixed(1)}°C): activate ventilation.`;
      case 'r4':  return `Temperature too low (${val.toFixed(1)}°C): protect the plant from cold.`;
      case 'r5':  return `Insufficient light (${val.toFixed(0)}%): activate LED lighting.`;
      case 'r6':  return `Insufficient light (${val.toFixed(0)}%) even with automatic lighting. Consider moving the tank to a brighter area.`;
      case 'r7':  return `Soil pH too low (${val.toFixed(1)}): add crushed limestone or dolomite to raise the pH.`;
      case 'r8':  return `Soil pH too high (${val.toFixed(1)}): add sulfur or organic compost to lower the pH.`;
      case 'r9':  return `Soil pH critical (${val.toFixed(1)}): very acid soil inhibits nutrient uptake. Urgent correction needed.`;
      case 'r10': return `Soil pH critical (${val.toFixed(1)}): very alkaline soil causes iron and manganese deficiency.`;
      case 'r11': return `Battery low (${val.toFixed(0)}%): plan to replace it soon.`;
      case 'r12': return `Battery very low (${val.toFixed(0)}%): replace immediately to avoid sensor loss.`;
      case 'r13': return `Battery critical (${val.toFixed(0)}%): sensors may stop at any moment.`;
      case 'r14': return `Water tank low (${val.toFixed(0)}%): refill soon to ensure auto watering.`;
      case 'r15': return `Water tank almost empty (${val.toFixed(0)}%): auto watering limited. Refill urgently.`;
    }
  }
  switch (id) {
    case 'r1':  return `Humidité critique (${val.toFixed(0)}%) : utilisez le bouton Arroser.`;
    case 'r2':  return `Sol trop humide (${val.toFixed(0)}%) : suspendez l'arrosage.`;
    case 'r3':  return `Température trop élevée (${val.toFixed(1)}°C) : activez la ventilation.`;
    case 'r4':  return `Température trop basse (${val.toFixed(1)}°C) : protégez la plante du froid.`;
    case 'r5':  return `Lumière insuffisante (${val.toFixed(0)}%) : activez l'éclairage LED.`;
    case 'r6':  return `Lumière insuffisante (${val.toFixed(0)}%) même avec éclairage automatique. Envisagez de déplacer le bac vers une zone plus lumineuse.`;
    case 'r7':  return `pH sol trop bas (${val.toFixed(1)}) : ajoutez du calcaire broyé ou de la dolomite pour remonter le pH.`;
    case 'r8':  return `pH sol trop élevé (${val.toFixed(1)}) : ajoutez du soufre ou du compost organique pour abaisser le pH.`;
    case 'r9':  return `pH sol critique (${val.toFixed(1)}) : sol très acide, l'absorption des nutriments est bloquée. Correction urgente.`;
    case 'r10': return `pH sol critique (${val.toFixed(1)}) : sol très alcalin, risque de carence en fer et manganèse.`;
    case 'r11': return `Batterie faible (${val.toFixed(0)}%) : prévoyez un remplacement prochainement.`;
    case 'r12': return `Batterie très faible (${val.toFixed(0)}%) : remplacez-la immédiatement pour éviter une perte de données capteurs.`;
    case 'r13': return `Batterie critique (${val.toFixed(0)}%) : les capteurs peuvent s'arrêter à tout moment.`;
    case 'r14': return `Réservoir bas (${val.toFixed(0)}%) : remplissez-le prochainement pour assurer l'arrosage automatique.`;
    case 'r15': return `Réservoir quasi vide (${val.toFixed(0)}%) : arrosage automatique limité. Remplissage urgent.`;
  }
}
