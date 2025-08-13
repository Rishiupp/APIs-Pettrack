import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PetLocationMap from '../components/PetLocationMap';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../config';

const PetLocationScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;
  const [locations, setLocations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: `${petName} - Scan Locations`,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowMap(!showMap)}
        >
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      ),
    });

    fetchScanLocations();
  }, [petId, navigation, showMap]);

  const fetchScanLocations = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/qr/pets/${petId}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching scan locations:', error);
      Alert.alert('Error', 'Failed to fetch scan locations');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchScanLocations();
    setRefreshing(false);
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
      }
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderLocationsList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No scan locations yet</Text>
          <Text style={styles.emptySubtext}>
            Scan locations will appear here when someone scans your pet's QR code
          </Text>
        </View>
      ) : (
        locations.map((location, index) => (
          <View key={location.id} style={styles.locationItem}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIcon}>
                <Ionicons 
                  name="location" 
                  size={20} 
                  color={index === 0 ? "#FF4444" : "#007AFF"} 
                />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>
                  Scan #{locations.length - index}
                  {index === 0 && <Text style={styles.latestBadge}> • Latest</Text>}
                </Text>
                <Text style={styles.locationTime}>
                  {formatDateTime(location.timestamp)}
                </Text>
              </View>
            </View>
            
            <View style={styles.locationDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="pin-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {location.city || 'Unknown location'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {new Date(location.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="phone-portrait-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {location.deviceType || 'Unknown device'}
                </Text>
              </View>

              {location.accuracy && (
                <View style={styles.detailRow}>
                  <Ionicons name="radio-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    ±{Math.round(location.accuracy)}m accuracy
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {showMap ? (
        <PetLocationMap petId={petId} />
      ) : (
        renderLocationsList()
      )}
      
      {locations.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{locations.length}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {locations.length > 0 ? formatDateTime(locations[0].timestamp) : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last Seen</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerButton: {
    marginRight: 16,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  locationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  latestBadge: {
    color: '#FF4444',
    fontSize: 14,
  },
  locationTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationDetails: {
    paddingLeft: 52,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
});

export default PetLocationScreen;