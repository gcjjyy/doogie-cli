/**
 * Default values for DOSBox-X configuration
 *
 * These defaults are derived from Option.dat's first options
 * and represent the standard settings for Win9x emulation.
 *
 * The key format matches template placeholders: section_key
 * e.g., sdl_fullscreen, cpu_core, dosbox_memsize
 */

/**
 * Default values for Win9x (W95KR-x, W98KR-x, etc.) configurations
 * Values sourced from Option.dat first options and DGGL templates
 */
export const WIN9X_DEFAULTS: Record<string, string> = {
  // sdl section
  sdl_fullscreen: 'false',
  sdl_fulldouble: 'false',
  sdl_fullresolution: 'desktop',
  sdl_windowresolution: '1024x768',
  sdl_windowposition: '',
  sdl_display: '0',
  sdl_output: 'opengl',
  sdl_videodriver: '',
  sdl_transparency: '0',
  sdl_maximize: 'false',
  sdl_autolock: 'true',
  sdl_autolock_feedback: 'none',
  sdl_middle_unlock: 'none',
  sdl_clip_mouse_button: 'none',
  sdl_clip_key_modifier: 'none',
  sdl_clip_paste_bios: 'default',
  sdl_clip_paste_speed: '30',
  sdl_sensitivity: '50',
  sdl_usesystemcursor: 'false',
  sdl_mouse_emulation: 'locked',
  sdl_mouse_wheel_key: '-1',
  sdl_waitonerror: 'false',
  sdl_priority: 'higher',
  sdl_mapperfile: 'W9X-x.txt',
  sdl_usescancodes: 'false',
  sdl_overscan: '0',
  sdl_pixelshader: 'none',
  sdl_showbasic: 'true',
  sdl_showdetails: 'false',
  sdl_showmenu: 'true',

  // log section
  log_logfile: '',
  log_debuggerrun: 'normal',

  // dosbox section
  dosbox_language: '',
  dosbox_fastbioslogo: 'true',
  dosbox_startbanner: 'false',
  dosbox_bannercolortheme: 'default',
  'dosbox_dpi aware': 'false',
  'dosbox_quit warning': 'false',
  'dosbox_working directory option': 'default',
  'dosbox_working directory default': '',
  'dosbox_show advanced options': 'false',
  'dosbox_resolve config path': 'true',
  dosbox_hostkey: 'mapper',
  'dosbox_mapper send key': 'ctrlaltdel',
  dosbox_ime: 'auto',
  'dosbox_synchronize time': 'false',
  dosbox_machine: 'svga_s3',
  dosbox_captures: 'dosbox',
  dosbox_autosave: '',
  dosbox_saveslot: '1',
  dosbox_savefile: '',
  dosbox_saveremark: 'true',
  dosbox_forceloadstate: 'false',
  dosbox_a20: 'fast',
  dosbox_memsize: '256',
  dosbox_nocachedir: 'false',
  dosbox_freesizecap: 'cap',
  dosbox_convertdrivefat: 'true',
  dosbox_vmemsize: '4',
  dosbox_vmemsizekb: '0',

  // render section
  render_frameskip: '0',
  render_aspect: 'true',
  render_aspect_ratio: '0:0',
  render_char9: 'true',
  render_euro: '-1',
  render_doublescan: 'true',
  render_scaler: 'hardware2x',
  render_glshader: 'none',
  render_autofit: 'true',
  render_monochrome_pal: 'green',

  // pc98 section
  'pc98_pc-98 BIOS copyright string': 'true',
  'pc98_pc-98 fm board': 'auto',
  'pc98_pc-98 enable 256-color': 'true',
  'pc98_pc-98 enable 16-color': 'true',
  'pc98_pc-98 enable grcg': 'true',
  'pc98_pc-98 enable egc': 'true',
  'pc98_pc-98 bus mouse': 'true',
  'pc98_pc-98 force ibm keyboard layout': 'false',
  'pc98_pc-98 try font rom': 'true',
  'pc98_pc-98 anex86 font': '',

  // dosv section
  dosv_dosv: 'off',
  dosv_getsysfont: 'true',
  dosv_fontxsbcs: '',
  dosv_fontxsbcs16: '',
  dosv_fontxsbcs24: '',
  dosv_fontxdbcs: '',
  dosv_fontxdbcs14: '',
  dosv_fontxdbcs24: '',
  dosv_showdbcsnodosv: 'true',
  dosv_yen: 'false',
  dosv_fepcontrol: 'ias',
  dosv_vtext1: 'svga',
  dosv_vtext2: 'svga',
  dosv_use20pixelfont: 'false',
  dosv_j3100: 'off',
  dosv_j3100type: 'default',
  dosv_j3100colorscroll: 'false',

  // video section
  'video_high intensity blinking': 'true',

  // vsync section
  vsync_vsyncmode: 'off',
  vsync_vsyncrate: '75',

  // cpu section
  cpu_core: 'dynamic',
  cpu_fpu: 'true',
  'cpu_segment limits': 'true',
  cpu_cputype: 'pentium',
  cpu_cycles: 'max',
  cpu_cycleup: '150',
  cpu_cycledown: '100',
  cpu_turbo: 'false',
  cpu_apmbios: 'false',
  'cpu_integration device': 'false',
  cpu_isapnpbios: 'false',

  // keyboard section
  keyboard_aux: 'false',
  'keyboard_allow output port reset': 'true',
  keyboard_controllertype: 'auto',
  keyboard_auxdevice: 'intellimouse',

  // ttf section
  ttf_font: '',
  ttf_fontbold: '',
  ttf_fontital: '',
  ttf_fontboit: '',
  ttf_colors: '',
  ttf_outputswitch: 'auto',
  ttf_winperc: '60',
  ttf_ptsize: '0',
  ttf_lins: '0',
  ttf_cols: '0',
  ttf_righttoleft: 'false',
  ttf_wp: '',
  ttf_bold: 'true',
  ttf_italic: 'true',
  ttf_underline: 'true',
  ttf_strikeout: 'false',
  ttf_printfont: 'true',
  ttf_autodbcs: 'true',
  ttf_blinkc: 'true',
  ttf_gbk: 'false',
  ttf_chinasea: 'false',
  ttf_dosvfunc: 'false',

  // voodoo section
  voodoo_voodoo_card: 'false',
  voodoo_voodoo_maxmem: '4',
  voodoo_glide: 'emu',
  voodoo_lfb: 'full',
  voodoo_splash: 'false',

  // mixer section
  mixer_nosound: 'false',
  'mixer_sample accurate': 'false',
  mixer_swapstereo: 'false',
  mixer_rate: '44100',
  mixer_blocksize: '1024',
  mixer_prebuffer: '20',

  // midi section
  midi_mpu401: 'intelligent',
  midi_mpubase: '330',
  midi_mididevice: 'default',
  midi_midiconfig: '',
  midi_samplerate: '44100',
  midi_mpuirq: '-1',
  'midi_mt32.romdir': '',
  'midi_mt32.model': 'auto',
  'midi_fluid.driver': 'default',
  'midi_fluid.soundfont': '',

  // sblaster section
  sblaster_sbtype: 'sb16',
  sblaster_sbbase: '220',
  sblaster_irq: '7',
  sblaster_dma: '1',
  sblaster_hdma: '5',
  'sblaster_enable speaker': 'false',
  sblaster_sbmixer: 'true',
  sblaster_oplmode: 'auto',
  sblaster_oplemu: 'default',
  sblaster_oplrate: '44100',
  sblaster_oplport: '',
  sblaster_retrowave_bus: 'serial',
  sblaster_retrowave_port: '',
  sblaster_hardwarebase: '220',
  sblaster_goldplay: 'false',
  'sblaster_blaster environment variable': 'true',

  // gus section
  gus_gus: 'true',
  gus_gusrate: '44100',
  gus_gusmemsize: '-1',
  'gus_gus master volume': '100',
  gus_gusbase: '240',
  gus_gusirq: '5',
  gus_gusdma: '3',
  gus_gustype: 'classic',
  gus_ultradir: 'C:\\ULTRASND',

  // innova section
  innova_innova: 'false',
  innova_samplerate: '22050',
  innova_sidbase: '280',
  innova_quality: '0',

  // speaker section
  speaker_pcspeaker: 'true',
  speaker_pcrate: '44100',
  speaker_tandy: 'off',
  speaker_tandyrate: '44100',
  speaker_disney: 'false',
  speaker_ps1audio: 'false',
  speaker_ps1audiorate: '22050',

  // joystick section
  joystick_joysticktype: 'none',
  joystick_timed: 'true',
  joystick_autofire: 'false',
  joystick_swap34: 'false',
  joystick_buttonwrap: 'false',

  // mapper section (deadzone defaults)
  'mapper_joy1deadzone0-': '0.60',
  'mapper_joy1deadzone0+': '0.60',
  'mapper_joy1deadzone1-': '0.60',
  'mapper_joy1deadzone1+': '0.60',
  'mapper_joy1deadzone2-': '0.60',
  'mapper_joy1deadzone2+': '0.60',
  'mapper_joy1deadzone3-': '0.60',
  'mapper_joy1deadzone3+': '0.60',
  'mapper_joy1deadzone4-': '0.60',
  'mapper_joy1deadzone4+': '0.60',
  'mapper_joy1deadzone5-': '0.60',
  'mapper_joy1deadzone5+': '0.60',
  'mapper_joy1deadzone6-': '0.60',
  'mapper_joy1deadzone6+': '0.60',
  'mapper_joy1deadzone7-': '0.60',
  'mapper_joy1deadzone7+': '0.60',
  'mapper_joy2deadzone0-': '0.60',
  'mapper_joy2deadzone0+': '0.60',
  'mapper_joy2deadzone1-': '0.60',
  'mapper_joy2deadzone1+': '0.60',
  'mapper_joy2deadzone2-': '0.60',
  'mapper_joy2deadzone2+': '0.60',
  'mapper_joy2deadzone3-': '0.60',
  'mapper_joy2deadzone3+': '0.60',
  'mapper_joy2deadzone4-': '0.60',
  'mapper_joy2deadzone4+': '0.60',
  'mapper_joy2deadzone5-': '0.60',
  'mapper_joy2deadzone5+': '0.60',
  'mapper_joy2deadzone6-': '0.60',
  'mapper_joy2deadzone6+': '0.60',
  'mapper_joy2deadzone7-': '0.60',
  'mapper_joy2deadzone7+': '0.60',

  // serial section
  serial_serial1: 'dummy',
  serial_serial2: 'dummy',
  serial_serial3: 'disabled',
  serial_serial4: 'disabled',
  serial_serial5: 'disabled',
  serial_serial6: 'disabled',
  serial_serial7: 'disabled',
  serial_serial8: 'disabled',
  serial_serial9: 'disabled',
  serial_phonebookfile: 'phonebook.txt',

  // parallel section
  parallel_parallel1: 'disabled',
  parallel_parallel2: 'disabled',
  parallel_parallel3: 'disabled',
  parallel_parallel4: 'disabled',
  parallel_parallel5: 'disabled',
  parallel_parallel6: 'disabled',
  parallel_parallel7: 'disabled',
  parallel_parallel8: 'disabled',
  parallel_parallel9: 'disabled',
  parallel_dongle: 'false',

  // printer section
  printer_printer: 'false',
  printer_dpi: '360',
  printer_width: '85',
  printer_height: '110',
  printer_printoutput: 'png',
  printer_multipage: 'false',
  printer_device: '',
  printer_docpath: '.',
  printer_fontpath: '',
  printer_openwith: '',
  printer_openerror: 'false',
  printer_printdbcs: 'true',
  printer_shellhide: 'true',
  printer_timeout: '0',

  // dos section
  dos_xms: 'true',
  'dos_xms handles': '0',
  'dos_shell configuration as commands': 'true',
  dos_hma: 'true',
  'dos_hard drive data rate limit': '-1',
  'dos_floppy drive data rate limit': '0',
  'dos_ansi.sys': 'true',
  'dos_log console': 'false',
  dos_share: 'true',
  'dos_file access tries': '3',
  'dos_network redirector': 'true',
  'dos_minimum mcb free': '0',
  dos_ems: 'true',
  dos_umb: 'true',
  'dos_quick reboot': 'false',
  dos_ver: 'auto',
  dos_lfn: 'auto',
  dos_fat32setversion: 'ask',
  dos_shellhigh: 'auto',
  dos_automount: 'true',
  dos_automountall: 'true',
  dos_mountwarning: 'true',
  dos_autofixwarning: 'false',
  dos_startcmd: 'false',
  dos_starttranspath: 'true',
  dos_startwait: 'true',
  dos_startquiet: 'false',
  dos_vmware: 'true',
  dos_int33: 'true',
  dos_keyboardlayout: 'auto',
  dos_customcodepage: '',
  dos_dbcs: 'true',
  'dos_dos clipboard device enable': 'false',
  'dos_dos clipboard device name': 'CLIP$',
  'dos_dos clipboard api': 'true',

  // ipx section
  ipx_ipx: 'false',

  // ne2000 section
  ne2000_ne2000: 'false',
  ne2000_nicbase: '300',
  ne2000_nicirq: '3',
  ne2000_macaddr: 'AC:DE:48:88:99:AA',
  ne2000_backend: 'auto',

  // ethernet, pcap section
  'ethernet, pcap_realnic': '',
  'ethernet, pcap_timeout': '0',

  // ethernet, slirp section
  'ethernet, slirp_ipv4_network': '',
  'ethernet, slirp_ipv4_netmask': '',
  'ethernet, slirp_ipv4_host': '',
  'ethernet, slirp_ipv4_nameserver': '',
  'ethernet, slirp_ipv4_dhcp_start': '',

  // ide, primary section
  'ide, primary_enable': 'true',
  'ide, primary_pnp': 'false',

  // ide, secondary section
  'ide, secondary_enable': 'true',
  'ide, secondary_pnp': 'false',

  // ide, tertiary section
  'ide, tertiary_enable': 'false',
  'ide, tertiary_pnp': 'false',

  // ide, quaternary section
  'ide, quaternary_enable': 'false',
  'ide, quaternary_pnp': 'false',

  // ide, quinternary section
  'ide, quinternary_enable': 'false',
  'ide, quinternary_pnp': 'false',

  // ide, sexternary section
  'ide, sexternary_enable': 'false',
  'ide, sexternary_pnp': 'false',

  // ide, septernary section
  'ide, septernary_enable': 'false',
  'ide, septernary_pnp': 'false',

  // ide, octernary section
  'ide, octernary_enable': 'false',
  'ide, octernary_pnp': 'false',

  // fdc, primary section
  'fdc, primary_enable': 'true',
  'fdc, primary_pnp': 'false',
  'fdc, primary_mode': 'ps2',

  // 4dos section
  '4dos_rem': '',

  // config section
  config_rem: '',
  config_break: 'true',
  config_numlock: '',
  config_shell: '',
  config_dos: 'high',
  config_fcbs: '100',
  config_files: '127',
  config_country: '',
  config_lastdrive: 'z',
  config_install: '',
  config_installhigh: '',
  config_device: '',
  config_devicehigh: '',
};

/**
 * Get default value for a placeholder key
 */
export function getDefaultValue(key: string): string {
  return WIN9X_DEFAULTS[key] ?? '';
}

/**
 * Get all default values
 */
export function getAllDefaults(): Record<string, string> {
  return { ...WIN9X_DEFAULTS };
}
