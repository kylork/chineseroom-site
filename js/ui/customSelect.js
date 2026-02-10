/**
 * Custom select dropdown with search
 */

const CustomSelect = {
    models: [],
    
    /**
     * Initialize custom selects
     */
    init(models) {
        this.models = models;
        this.setupSelect('bot1');
        this.setupSelect('bot2');
    },
    
    /**
     * Setup a custom select
     */
    setupSelect(botId) {
        const trigger = document.getElementById(`${botId}ModelTrigger`);
        const dropdown = document.getElementById(`${botId}ModelDropdown`);
        const search = document.getElementById(`${botId}ModelSearch`);
        const optionsContainer = document.getElementById(`${botId}ModelOptions`);
        const hiddenInput = document.getElementById(`${botId}Model`);
        const display = document.getElementById(`${botId}ModelDisplay`);
        
        if (!trigger || !dropdown || !optionsContainer) return;
        
        // Populate options
        this.populateOptions(botId, optionsContainer);
        
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = dropdown.classList.contains('active');
            
            // Close all dropdowns first
            document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('active'));
            document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
            
            if (!isActive) {
                dropdown.classList.add('active');
                trigger.classList.add('active');
                search.value = '';
                search.focus();
                this.filterOptions(botId, '');
            }
        });
        
        // Search filtering
        search.addEventListener('input', (e) => {
            this.filterOptions(botId, e.target.value);
        });
        
        // Option selection
        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-select-option');
            if (option && !option.classList.contains('separator')) {
                const value = option.dataset.value;
                const text = option.textContent;
                
                hiddenInput.value = value;
                display.textContent = text;
                
                // Update selected state
                optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                
                // Close dropdown
                dropdown.classList.remove('active');
                trigger.classList.remove('active');
                
                // Update UI
                Sidebar.updateModelSettings(botId);
                Sidebar.updateDisplayNameVisibility();
                
                // Save
                Storage.saveSetting(`${botId}Model`, value);
            }
        });
    },
    
    /**
     * Populate options for a select
     */
    populateOptions(botId, container) {
        container.innerHTML = '';
        
        // Add Human option
        const humanOption = document.createElement('div');
        humanOption.className = 'custom-select-option';
        humanOption.dataset.value = 'human';
        humanOption.textContent = 'Human';
        container.appendChild(humanOption);
        
        // Add model options
        if (this.models && this.models.length > 0) {
            this.models.forEach(model => {
                const option = document.createElement('div');
                option.className = 'custom-select-option';
                option.dataset.value = model.id;
                option.textContent = model.name;
                container.appendChild(option);
            });
            
            // Set default
            AppState.defaultModelId = this.models[0].id;
            AppState.defaultModelName = this.models[0].name;
        }
        
        // Set initial display
        const display = document.getElementById(`${botId}ModelDisplay`);
        const hiddenInput = document.getElementById(`${botId}Model`);
        if (display && hiddenInput) {
            display.textContent = AppState.defaultModelName;
            hiddenInput.value = AppState.defaultModelId;
        }
    },
    
    /**
     * Filter options based on search term
     */
    filterOptions(botId, searchTerm) {
        const optionsContainer = document.getElementById(`${botId}ModelOptions`);
        const options = optionsContainer.querySelectorAll('.custom-select-option');
        const term = searchTerm.toLowerCase();
        
        options.forEach(option => {
            if (option.classList.contains('separator')) {
                option.style.display = '';
                return;
            }
            
            const text = option.textContent.toLowerCase();
            const value = option.dataset.value.toLowerCase();
            
            // Always show Human option
            if (value === 'human') {
                option.style.display = '';
                return;
            }
            
            // Show if matches search
            if (text.includes(term) || value.includes(term)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    },
    
    /**
     * Close all dropdowns when clicking outside
     */
    setupGlobalClose() {
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('active'));
            document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        });
    }
};

// Setup global close listener
document.addEventListener('DOMContentLoaded', () => {
    CustomSelect.setupGlobalClose();
});
