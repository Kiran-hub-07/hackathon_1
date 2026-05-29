import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Alert, 
  ActivityIndicator, TextInput, ScrollView, Modal 
} from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  // Core State
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sirenSound, setSirenSound] = useState(null);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    name: '', age: '', bloodGroup: '', emergencyContact: '', medicalIssues: ''
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load Profile and configure audio on launch
  useEffect(() => {
    loadProfileData();
    configureAudioSystem();

    return () => {
      if (sirenSound) {
        sirenSound.unloadAsync();
      }
    };
  }, []);

  const loadProfileData = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('@user_profile');
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch (e) {
      console.log("Failed to load profile data.");
    }
  };

  const saveProfileData = async () => {
    try {
      await AsyncStorage.setItem('@user_profile', JSON.stringify(profile));
      setIsProfileModalOpen(false);
      Alert.alert("Success", "Emergency Profile Saved Locally.");
    } catch (e) {
      Alert.alert("Error", "Could not save profile data.");
    }
  };

  // Ensure audio plays even if the phone is on silent/vibrate switch
  const configureAudioSystem = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceAndroid: false,
        stayActiveInBackground: true,
      });
    } catch (e) {
      console.log("Audio mode setup error:", e);
    }
  };

  // GPS Core Function
  const fetchCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is critical for tracking services.');
      return null;
    }
    let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(currentPosition.coords);
    return currentPosition.coords;
  };

  // Smart Deep-Linked Navigation Routing
  const navigateToNearest = async (type) => {
    setLoading(true);
    const coords = await fetchCurrentLocation();
    setLoading(false);

    if (!coords) return;

    let query = '';
    if (type === 'hospital') query = 'Hospital';
    if (type === 'police') query = 'Police Station';
    if (type === 'rescue') query = 'Car Towing Roadside Assistance';

    const url = `https://www.google.com/maps/search/?api=1&query=${query}&center=${coords.latitude},${coords.longitude}`;
    Linking.openURL(url);
  };

  // Smart Offline SMS Pipeline
  const sendEmergencySMS = async () => {
    setLoading(true);
    const coords = await fetchCurrentLocation();
    setLoading(false);

    const targetContact = profile.emergencyContact || '';
    const mapLink = coords ? `\nMap Link: https://maps.google.com/?q=${coords.latitude},${coords.longitude}` : '\n(GPS coordinates unavailable)';
    
    const contextMessage = `ROAD SOS DISTRESS ALERT!\nName: ${profile.name}\nBlood Group: ${profile.bloodGroup}\nMed Conditions: ${profile.medicalIssues}${mapLink}`;

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([targetContact], contextMessage);
    } else {
      Alert.alert('SMS Failure', 'Native SMS manager interface could not be launched.');
    }
  };

  // Native Camera Analysis Pipeline
  const captureAndAnalyzeInjury = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera access is needed to evaluate injuries.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      Alert.alert(
        "Smart First Aid Assessment",
        "Visual diagnosis simulation complete:\n\n1. Keep wound clean and apply direct pressure using sterile cloth.\n2. Elevate the structural area above heart level to limit throbbing.\n3. Keep user calm until first responders make structural contact."
      );
    }
  };

  // REAL AUDIO CONTROLLER
  const togglePanicSiren = async () => {
    try {
      if (isSirenPlaying && sirenSound) {
        // Stop the sound completely
        await sirenSound.stopAsync();
        await sirenSound.unloadAsync();
        setSirenSound(null);
        setIsSirenPlaying(false);
      } else {
        setLoading(true);
        // Load a real high-pitched warning alarm tone from a public archive URL
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        
        setSirenSound(sound);
        setIsSirenPlaying(true);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Audio Error", "Could not load the siren audio track. Ensure your phone has internet access.");
      console.log(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>RoadSoS</Text>
        <TouchableOpacity style={styles.profileOpenButton} onPress={() => setIsProfileModalOpen(true)}>
          <Text style={styles.profileOpenButtonText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Panic Row */}
      <View style={styles.panicContainer}>
        <TouchableOpacity style={styles.sosButton} onPress={sendEmergencySMS}>
          <Text style={styles.sosText}>SEND DISTRESS{"\n"}SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sirenButton, isSirenPlaying && styles.sirenActiveButton]} 
          onPress={togglePanicSiren}
        >
          <Text style={styles.sirenText}>{isSirenPlaying ? "⏹ STOP" : "🚨 SIREN"}</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Nav Systems */}
      <Text style={styles.sectionHeader}>Emergency Infrastructure Locators</Text>
      
      <TouchableOpacity style={[styles.navCard, {borderColor: '#ff4444'}]} onPress={() => navigateToNearest('hospital')}>
        <Text style={styles.navCardText}>🏥 Route to Nearest Hospital</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.navCard, {borderColor: '#33b5e5'}]} onPress={() => navigateToNearest('police')}>
        <Text style={styles.navCardText}>🚔 Route to Nearest Police Station</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.navCard, {borderColor: '#ffbb33'}]} onPress={() => navigateToNearest('rescue')}>
        <Text style={styles.navCardText}>🛠 Route to Towing & Vehicle Rescue</Text>
      </TouchableOpacity>

      {/* First Aid AI Modules */}
      <Text style={styles.sectionHeader}>Smart Clinical First Aid</Text>
      <TouchableOpacity style={styles.cameraCard} onPress={captureAndAnalyzeInjury}>
        <Text style={styles.cameraCardText}>📸 Scan Injury for First Aid Guide</Text>
      </TouchableOpacity>

      {/* Global Processing Indicators */}
      {loading && (
        <View style={styles.globalLoader}>
          <ActivityIndicator size="large" color="#ff4444" />
          <Text style={{color: '#fff', marginTop: 10}}>Configuring Systems...</Text>
        </View>
      )}

      {/* Local Profile Setup Sheet */}
      <Modal visible={isProfileModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Medical & Emergency Profile</Text>
            
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#666" value={profile.name} onChangeText={(t) => setProfile({...profile, name: t})} />
            <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#666" keyboardType="numeric" value={profile.age} onChangeText={(t) => setProfile({...profile, age: t})} />
            <TextInput style={styles.input} placeholder="Blood Group (e.g. O+)" placeholderTextColor="#666" value={profile.bloodGroup} onChangeText={(t) => setProfile({...profile, bloodGroup: t})} />
            <TextInput style={styles.input} placeholder="Emergency Contact Number" placeholderTextColor="#666" keyboardType="phone-pad" value={profile.emergencyContact} onChangeText={(t) => setProfile({...profile, emergencyContact: t})} />
            <TextInput style={[styles.input, {height: 80}]} placeholder="Chronic Medical Conditions / Allergies" placeholderTextColor="#666" multiline value={profile.medicalIssues} onChangeText={(t) => setProfile({...profile, medicalIssues: t})} />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.saveBtn]} onPress={saveProfileData}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeBtn]} onPress={() => setIsProfileModalOpen(false)}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#121212', flexGrow: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 36, fontWeight: '900', color: '#ff4444' },
  profileOpenButton: { backgroundColor: '#222', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#444' },
  profileOpenButtonText: { color: '#fff', fontWeight: 'bold' },
  panicContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  sosButton: { backgroundColor: '#ff4444', flex: 0.65, height: 120, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  sosText: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sirenButton: { backgroundColor: '#333', flex: 0.3, height: 120, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffbb33' },
  sirenActiveButton: { backgroundColor: '#ffbb33' },
  sirenText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { color: '#888', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15, marginTop: 10 },
  navCard: { backgroundColor: '#1e1e1e', padding: 18, borderRadius: 14, borderWidth: 1.5, marginBottom: 12 },
  navCardText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraCard: { backgroundColor: '#007aff', padding: 20, borderRadius: 14, alignItems: 'center' },
  cameraCardText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  globalLoader: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1e1e', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#2d2d2d', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, fontSize: 15 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 0.47, padding: 15, borderRadius: 10, alignItems: 'center' },
  saveBtn: { backgroundColor: '#00ff66' },
  closeBtn: { backgroundColor: '#444' },
  btnText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
});
