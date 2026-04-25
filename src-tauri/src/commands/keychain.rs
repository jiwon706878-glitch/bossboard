use keyring::Entry;

#[derive(Debug, thiserror::Error)]
pub enum KeychainError {
    #[error("Keychain error: {0}")]
    Keychain(String),
}

impl serde::Serialize for KeychainError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

const SERVICE_PREFIX: &str = "BossBoard.";
const ACCOUNT: &str = "default";

#[tauri::command]
pub async fn keychain_set(key: String, value: String) -> Result<(), KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, ACCOUNT)
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    entry
        .set_password(&value)
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn keychain_get(key: String) -> Result<Option<String>, KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, ACCOUNT)
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(KeychainError::Keychain(e.to_string())),
    }
}

#[tauri::command]
pub async fn keychain_delete(key: String) -> Result<(), KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, ACCOUNT)
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    let _ = entry.delete_password();
    Ok(())
}
