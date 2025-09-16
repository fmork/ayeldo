import {
  Add as AddIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  Favorite as FavoriteIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { defaultShape, defaultTypography } from '../theme/createAppTheme';

const ThemeShowcase: FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Theme Showcase
      </Typography>
      <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
        Comprehensive preview of all theme elements and color schemes
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Color Palette Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Color Palette
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Primary Colors */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Typography variant="h6" gutterBottom>Primary Colors</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Primary Main
              </Box>
              <Box sx={{
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Primary Light
              </Box>
              <Box sx={{
                bgcolor: 'primary.dark',
                color: 'primary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Primary Dark
              </Box>
            </Box>
          </Box>

          {/* Secondary Colors */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Typography variant="h6" gutterBottom>Secondary Colors</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Secondary Main
              </Box>
              <Box sx={{
                bgcolor: 'secondary.light',
                color: 'secondary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Secondary Light
              </Box>
              <Box sx={{
                bgcolor: 'secondary.dark',
                color: 'secondary.contrastText',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Secondary Dark
              </Box>
            </Box>
          </Box>

          {/* Background & Text Colors */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Typography variant="h6" gutterBottom>Background & Text</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Typography color="text.primary">Primary Text</Typography>
                <Typography color="text.secondary">Secondary Text</Typography>
                <Typography color="text.disabled">Disabled Text</Typography>
              </Paper>
              <Box sx={{
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                p: 2,
                borderRadius: defaultShape.borderRadius
              }}>
                Background Default
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Typography Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Typography
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Typography variant="h1">Heading 1</Typography>
            <Typography variant="h2">Heading 2</Typography>
            <Typography variant="h3">Heading 3</Typography>
            <Typography variant="h4">Heading 4</Typography>
            <Typography variant="h5">Heading 5</Typography>
            <Typography variant="h6">Heading 6</Typography>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Typography variant="subtitle1">Subtitle 1</Typography>
            <Typography variant="subtitle2">Subtitle 2</Typography>
            <Typography variant="body1">Body 1 - Regular paragraph text with normal weight</Typography>
            <Typography variant="body2">Body 2 - Smaller paragraph text</Typography>
            <Typography variant="button">BUTTON TEXT</Typography>
            <Typography variant="caption">Caption text</Typography>
            <Typography variant="overline">OVERLINE TEXT</Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Buttons Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Buttons
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 250 }}>
            <Typography variant="h6" gutterBottom>Contained Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="contained" color="primary">Primary</Button>
              <Button variant="contained" color="secondary">Secondary</Button>
              <Button variant="contained" disabled>Disabled</Button>
            </Box>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 250 }}>
            <Typography variant="h6" gutterBottom>Outlined Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outlined" color="primary">Primary</Button>
              <Button variant="outlined" color="secondary">Secondary</Button>
              <Button variant="outlined" disabled>Disabled</Button>
            </Box>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 250 }}>
            <Typography variant="h6" gutterBottom>Text Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="text" color="primary">Primary</Button>
              <Button variant="text" color="secondary">Secondary</Button>
              <Button variant="text" disabled>Disabled</Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Form Controls Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Form Controls
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField label="Standard Input" variant="outlined" />
              <TextField label="Filled Input" variant="filled" />
              <TextField label="Error State" variant="outlined" error helperText="This field has an error" />
              <TextField label="Disabled" variant="outlined" disabled />

              <FormControl>
                <InputLabel>Select Option</InputLabel>
                <Select defaultValue="" label="Select Option">
                  <MenuItem value="option1">Option 1</MenuItem>
                  <MenuItem value="option2">Option 2</MenuItem>
                  <MenuItem value="option3">Option 3</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <RadioGroup>
                <FormControlLabel value="option1" control={<Radio />} label="Radio Option 1" />
                <FormControlLabel value="option2" control={<Radio />} label="Radio Option 2" />
                <FormControlLabel value="option3" control={<Radio />} label="Radio Option 3 (Disabled)" disabled />
              </RadioGroup>

              <Box>
                <FormControlLabel control={<Checkbox />} label="Checkbox Option 1" />
                <FormControlLabel control={<Checkbox defaultChecked />} label="Checkbox Option 2" />
                <FormControlLabel control={<Checkbox disabled />} label="Disabled Checkbox" />
              </Box>

              <Box>
                <FormControlLabel control={<Switch />} label="Switch Option" />
                <FormControlLabel control={<Switch defaultChecked />} label="Switch Checked" />
                <FormControlLabel control={<Switch disabled />} label="Switch Disabled" />
              </Box>

              <Box>
                <Typography gutterBottom>Slider</Typography>
                <Slider defaultValue={30} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Cards and Interactive Elements */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Cards & Interactive Elements
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Card Title
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is a sample card with primary content and actions.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button size="small" color="primary">Action</Button>
                  <Button size="small" color="secondary">Learn More</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Typography variant="h6" gutterBottom>Chips & Badges</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Default" />
                <Chip label="Primary" color="primary" />
                <Chip label="Secondary" color="secondary" />
                <Chip label="Deletable" onDelete={() => console.log('Delete clicked')} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Badge badgeContent={4} color="primary">
                  <EmailIcon />
                </Badge>
                <Badge badgeContent={99} color="secondary">
                  <Avatar>A</Avatar>
                </Badge>
                <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>S</Avatar>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, minWidth: 280 }}>
            <Typography variant="h6" gutterBottom>Progress & Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LinearProgress />
              <LinearProgress variant="determinate" value={50} />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CircularProgress size={24} />
                <CircularProgress variant="determinate" value={75} size={24} />
                <IconButton color="primary">
                  <FavoriteIcon />
                </IconButton>
                <Fab size="small" color="primary">
                  <AddIcon />
                </Fab>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feedback Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Feedback & Alerts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success">This is a success alert with primary colors</Alert>
          <Alert severity="info">This is an info alert with informational styling</Alert>
          <Alert severity="warning">This is a warning alert with attention colors</Alert>
          <Alert severity="error">This is an error alert with danger colors</Alert>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Theme Variables Display */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Theme Configuration
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Typography Settings</Typography>
              <Typography variant="body2">
                Font Family: {defaultTypography.fontFamily}
              </Typography>
              <Typography variant="body2">
                Base Font Size: {defaultTypography.fontSize}px
              </Typography>
              <Typography variant="body2">
                Font Weights: Light({defaultTypography.fontWeightLight}),
                Regular({defaultTypography.fontWeightRegular}),
                Medium({defaultTypography.fontWeightMedium}),
                Bold({defaultTypography.fontWeightBold})
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' }, minWidth: 300 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Shape Settings</Typography>
              <Typography variant="body2">
                Border Radius: {defaultShape.borderRadius}px
              </Typography>
              <Box sx={{
                mt: 2,
                p: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: defaultShape.borderRadius
              }}>
                Example with default border radius
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Buttons Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Buttons
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Contained Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="contained" color="primary">Primary</Button>
              <Button variant="contained" color="secondary">Secondary</Button>
              <Button variant="contained" disabled>Disabled</Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Outlined Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outlined" color="primary">Primary</Button>
              <Button variant="outlined" color="secondary">Secondary</Button>
              <Button variant="outlined" disabled>Disabled</Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Text Buttons</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="text" color="primary">Primary</Button>
              <Button variant="text" color="secondary">Secondary</Button>
              <Button variant="text" disabled>Disabled</Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Form Controls Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Form Controls
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField label="Standard Input" variant="outlined" />
              <TextField label="Filled Input" variant="filled" />
              <TextField label="Error State" variant="outlined" error helperText="This field has an error" />
              <TextField label="Disabled" variant="outlined" disabled />

              <FormControl>
                <InputLabel>Select Option</InputLabel>
                <Select defaultValue="" label="Select Option">
                  <MenuItem value="option1">Option 1</MenuItem>
                  <MenuItem value="option2">Option 2</MenuItem>
                  <MenuItem value="option3">Option 3</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <RadioGroup>
                <FormControlLabel value="option1" control={<Radio />} label="Radio Option 1" />
                <FormControlLabel value="option2" control={<Radio />} label="Radio Option 2" />
                <FormControlLabel value="option3" control={<Radio />} label="Radio Option 3 (Disabled)" disabled />
              </RadioGroup>

              <Box>
                <FormControlLabel control={<Checkbox />} label="Checkbox Option 1" />
                <FormControlLabel control={<Checkbox defaultChecked />} label="Checkbox Option 2" />
                <FormControlLabel control={<Checkbox disabled />} label="Disabled Checkbox" />
              </Box>

              <Box>
                <FormControlLabel control={<Switch />} label="Switch Option" />
                <FormControlLabel control={<Switch defaultChecked />} label="Switch Checked" />
                <FormControlLabel control={<Switch disabled />} label="Switch Disabled" />
              </Box>

              <Box>
                <Typography gutterBottom>Slider</Typography>
                <Slider defaultValue={30} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Cards and Papers Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Cards & Papers
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Card Title
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is a sample card with primary content and actions.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button size="small" color="primary">Action</Button>
                  <Button size="small" color="secondary">Learn More</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Elevated Paper
              </Typography>
              <Typography variant="body2">
                Paper component with elevation=3 showing depth and shadow.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Outlined Paper
              </Typography>
              <Typography variant="body2">
                Paper component with outlined variant showing border instead of shadow.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Interactive Elements Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Interactive Elements
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom>Chips</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Default" />
                  <Chip label="Primary" color="primary" />
                  <Chip label="Secondary" color="secondary" />
                  <Chip label="Deletable" onDelete={() => { }} />
                  <Chip label="Disabled" disabled />
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>Badges & Avatars</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Badge badgeContent={4} color="primary">
                    <EmailIcon />
                  </Badge>
                  <Badge badgeContent={99} color="secondary">
                    <Avatar>A</Avatar>
                  </Badge>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>S</Avatar>
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom>Progress Indicators</Typography>
                <LinearProgress sx={{ mb: 2 }} />
                <LinearProgress variant="determinate" value={50} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <CircularProgress size={24} />
                  <CircularProgress variant="determinate" value={75} size={24} />
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>Icon Buttons & FAB</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <IconButton color="primary">
                    <FavoriteIcon />
                  </IconButton>
                  <IconButton color="secondary">
                    <StarIcon />
                  </IconButton>
                  <Fab size="small" color="primary">
                    <AddIcon />
                  </Fab>
                  <Fab size="small" color="secondary">
                    <SettingsIcon />
                  </Fab>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Lists and Navigation Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Lists & Navigation
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>List Components</Typography>
            <Paper>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Home" secondary="Navigate to home page" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Settings" secondary="Configure application" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText primary="Messages" secondary="View messages" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Navigation Elements</Typography>
            <Box sx={{ mb: 3 }}>
              <Breadcrumbs>
                <Link color="inherit" href="#">Home</Link>
                <Link color="inherit" href="#">Category</Link>
                <Typography color="text.primary">Current Page</Typography>
              </Breadcrumbs>
            </Box>
            <Paper>
              <Tabs value={0}>
                <Tab label="Tab One" />
                <Tab label="Tab Two" />
                <Tab label="Tab Three" />
              </Tabs>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feedback Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Feedback & Alerts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success">This is a success alert with primary colors</Alert>
          <Alert severity="info">This is an info alert with informational styling</Alert>
          <Alert severity="warning">This is a warning alert with attention colors</Alert>
          <Alert severity="error">This is an error alert with danger colors</Alert>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Expandable Content Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Expandable Content
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion Section 1</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              This is the content of the first accordion section. It demonstrates how the theme
              colors work with expandable content areas.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion Section 2</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              This second section shows consistent styling across multiple accordion items.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Tooltips Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Tooltips & Helper Elements
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Tooltip title="This is a primary tooltip">
            <Button variant="contained" color="primary">Hover for Tooltip</Button>
          </Tooltip>
          <Tooltip title="This is a secondary tooltip">
            <Button variant="contained" color="secondary">Secondary Tooltip</Button>
          </Tooltip>
          <Tooltip title="Tooltip on icon">
            <IconButton>
              <PhoneIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Theme Variables Display */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Theme Configuration
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Typography Settings</Typography>
              <Typography variant="body2">
                Font Family: {defaultTypography.fontFamily}
              </Typography>
              <Typography variant="body2">
                Base Font Size: {defaultTypography.fontSize}px
              </Typography>
              <Typography variant="body2">
                Font Weights: Light({defaultTypography.fontWeightLight}),
                Regular({defaultTypography.fontWeightRegular}),
                Medium({defaultTypography.fontWeightMedium}),
                Bold({defaultTypography.fontWeightBold})
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Shape Settings</Typography>
              <Typography variant="body2">
                Border Radius: {defaultShape.borderRadius}px
              </Typography>
              <Box sx={{
                mt: 2,
                p: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: defaultShape.borderRadius
              }}>
                Example with default border radius
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ThemeShowcase;
